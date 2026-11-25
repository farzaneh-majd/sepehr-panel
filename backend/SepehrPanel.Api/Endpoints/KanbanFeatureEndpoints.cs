using Microsoft.EntityFrameworkCore;
using SepehrPanel.Api.Data;
using SepehrPanel.Api.Models;

namespace SepehrPanel.Api.Endpoints;

public static class KanbanFeatureEndpoints
{
    private const long MaxUploadBytes = 25 * 1024 * 1024;

    public static void MapKanbanFeatures(this RouteGroupBuilder api)
    {
        MapBoardFeatures(api);
        MapCardFeatures(api);
        MapChecklistFeatures(api);
        MapBugFeatures(api);
        api.MapGet("/files/{id:int}", DownloadFile).RequireAuthorization();
    }

    private static void MapBoardFeatures(RouteGroupBuilder api)
    {
        var boards = api.MapGroup("/board").RequireAuthorization();

        boards.MapGet("/{id:int}/members/search", async (int id, string? q, AppDbContext db) =>
        {
            var memberIds = db.BoardMembers.Where(x => x.BoardId == id).Select(x => x.UserId);
            var query = db.Users.Where(x => x.IsActive && !memberIds.Contains(x.Id));
            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim().ToLower();
                query = query.Where(x => x.Username.ToLower().Contains(term) || x.Email.ToLower().Contains(term) ||
                    (x.FirstName != null && x.FirstName.ToLower().Contains(term)) || (x.LastName != null && x.LastName.ToLower().Contains(term)));
            }
            var users = await query.OrderBy(x => x.FirstName).Take(30).Select(x => new
            {
                x.Id, x.FirstName, x.LastName, x.Email, avatarUrl = (string?)null
            }).ToListAsync();
            return Results.Ok(Api.Ok(users));
        });

        boards.MapPost("/{id:int}/members", async (int id, BoardMemberWrite request, AppDbContext db) =>
        {
            if (!await db.Boards.AnyAsync(x => x.Id == id) || !await db.Users.AnyAsync(x => x.Id == request.UserId && x.IsActive))
                return Results.NotFound();
            var existing = await db.BoardMembers.SingleOrDefaultAsync(x => x.BoardId == id && x.UserId == request.UserId);
            if (existing is not null) return Results.Conflict(new { message = "This user is already a board member." });
            var member = new BoardMember { BoardId = id, UserId = request.UserId, Role = ValidRole(request.Role) };
            db.BoardMembers.Add(member);
            await db.SaveChangesAsync();
            var user = await db.Users.FindAsync(member.UserId);
            return Results.Created($"/api/board/{id}/members/{member.Id}", Api.Ok(new { member.Id, member.UserId, member.Role, user!.FirstName, user.LastName, user.Email, user.Username, avatarId = (int?)null, avatarUrl = (string?)null }));
        });

        boards.MapPut("/{id:int}/members/{memberId:int}", async (int id, int memberId, BoardMemberRole request, AppDbContext db) =>
        {
            var member = await db.BoardMembers.SingleOrDefaultAsync(x => x.Id == memberId && x.BoardId == id);
            if (member is null) return Results.NotFound();
            if (member.Role == "owner") return Results.BadRequest(new { message = "The board owner's role cannot be changed." });
            member.Role = ValidRole(request.Role);
            await db.SaveChangesAsync();
            return Results.Ok(Api.Ok(await MemberDto(db, member)));
        });

        boards.MapDelete("/{id:int}/members/{memberId:int}", async (int id, int memberId, AppDbContext db) =>
        {
            var member = await db.BoardMembers.SingleOrDefaultAsync(x => x.Id == memberId && x.BoardId == id);
            if (member is null) return Results.NotFound();
            if (member.Role == "owner") return Results.BadRequest(new { message = "The board owner cannot be removed." });
            db.BoardMembers.Remove(member);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        boards.MapGet("/{id:int}/members/{userId:int}/activity", async (int id, int userId, AppDbContext db) =>
        {
            var activities = await (from activity in db.CardActivities
                                    join card in db.Cards on activity.CardId equals card.Id
                                    join list in db.BoardLists on card.ListId equals list.Id
                                    where list.BoardId == id && activity.UserId == userId
                                    orderby activity.CreatedAt descending
                                    select new { activity.Id, activity.Action, activity.CreatedAt, cardId = (int?)card.Id, cardTitle = card.Title, listName = list.Name })
                .Take(100).ToListAsync();
            return Results.Ok(Api.Ok(activities));
        });

        boards.MapGet("/{id:int}/unlinked-tasks", async (int id, AppDbContext db) =>
        {
            var projectId = await db.Boards.Where(x => x.Id == id).Select(x => x.ProjectId).SingleOrDefaultAsync();
            if (!projectId.HasValue) return Results.Ok(Api.Ok(Array.Empty<object>()));
            var linked = db.Cards.Where(x => x.TaskId != null && !x.IsDeleted).Select(x => x.TaskId!.Value);
            var tasks = await db.Tasks.Where(x => x.ProjectId == projectId && !linked.Contains(x.Id) && !x.IsCompleted)
                .OrderBy(x => x.Name).Select(x => new { x.Id, x.Name, x.Description, x.ProjectId, x.CreatedAt }).ToListAsync();
            return Results.Ok(Api.Ok(tasks));
        });

        boards.MapGet("/{id:int}/labels", async (int id, AppDbContext db) =>
            Results.Ok(Api.Ok(await db.BoardLabels.Where(x => x.BoardId == id).OrderBy(x => x.Name).Select(x => new { x.Id, x.Name, x.Color, x.BoardId }).ToListAsync())));

        boards.MapPost("/{id:int}/labels", async (int id, LabelWrite request, AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Color)) return Results.BadRequest(new { message = "Name and color are required." });
            if (await db.BoardLabels.AnyAsync(x => x.BoardId == id && x.Name == request.Name.Trim())) return Results.Conflict(new { message = "A label with this name already exists." });
            var label = new BoardLabel { BoardId = id, Name = request.Name.Trim(), Color = request.Color.Trim() };
            db.BoardLabels.Add(label); await db.SaveChangesAsync();
            return Results.Created($"/api/labels/{label.Id}", Api.Ok(LabelDto(label)));
        });

        boards.MapGet("/{id:int}/checklists", async (int id, AppDbContext db) =>
        {
            var rows = await (from checklist in db.Checklists
                              join card in db.Cards on checklist.CardId equals card.Id
                              join list in db.BoardLists on card.ListId equals list.Id
                              where list.BoardId == id && !card.IsDeleted && !list.IsDeleted
                              orderby card.Title, checklist.Position
                              select new { checklist.Id, checklist.Name, checklist.CardId, cardTitle = card.Title, itemCount = db.ChecklistItems.Count(x => x.ChecklistId == checklist.Id) })
                .ToListAsync();
            return Results.Ok(Api.Ok(rows));
        });

        boards.MapGet("/{id:int}/trash", async (int id, AppDbContext db) =>
        {
            var lists = await db.BoardLists.Where(x => x.BoardId == id && x.IsDeleted).OrderByDescending(x => x.DeletedAt)
                .Select(x => new { x.Id, x.Name, cardCount = db.Cards.Count(c => c.ListId == x.Id), x.DeletedAt }).ToListAsync();
            var cards = await (from card in db.Cards
                               join list in db.BoardLists on card.ListId equals list.Id
                               where list.BoardId == id && (card.IsDeleted || list.IsDeleted)
                               orderby card.DeletedAt descending
                               select new { card.Id, card.Title, listId = (int?)list.Id, listName = list.Name, listDeleted = list.IsDeleted, card.DeletedAt }).ToListAsync();
            return Results.Ok(Api.Ok(new { cards, lists }));
        });

        boards.MapPost("/{id:int}/trash/cards/{cardId:int}/restore", async (int id, int cardId, HttpContext http, AppDbContext db) =>
        {
            var card = await (from c in db.Cards join l in db.BoardLists on c.ListId equals l.Id where c.Id == cardId && l.BoardId == id select c).SingleOrDefaultAsync();
            if (card is null) return Results.NotFound();
            card.IsDeleted = false; card.DeletedAt = null; card.UpdatedById = Api.UserId(http.User); await db.SaveChangesAsync(); return Results.Ok(Api.Ok(new { card.Id }));
        });

        boards.MapPost("/{id:int}/trash/lists/{listId:int}/restore", async (int id, int listId, HttpContext http, AppDbContext db) =>
        {
            var list = await db.BoardLists.SingleOrDefaultAsync(x => x.Id == listId && x.BoardId == id);
            if (list is null) return Results.NotFound();
            list.IsDeleted = false; list.DeletedAt = null; list.UpdatedById = Api.UserId(http.User); await db.SaveChangesAsync(); return Results.Ok(Api.Ok(new { list.Id }));
        });

        api.MapPut("/labels/{id:int}", async (int id, LabelWrite request, AppDbContext db) =>
        {
            var label = await db.BoardLabels.FindAsync(id); if (label is null) return Results.NotFound();
            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Color)) return Results.BadRequest();
            label.Name = request.Name.Trim(); label.Color = request.Color.Trim(); await db.SaveChangesAsync();
            return Results.Ok(Api.Ok(LabelDto(label)));
        }).RequireAuthorization();

        api.MapDelete("/labels/{id:int}", async (int id, AppDbContext db) =>
        {
            var label = await db.BoardLabels.FindAsync(id); if (label is null) return Results.NotFound();
            db.BoardLabels.Remove(label); await db.SaveChangesAsync(); return Results.NoContent();
        }).RequireAuthorization();
    }

    private static void MapCardFeatures(RouteGroupBuilder api)
    {
        var cards = api.MapGroup("/card").RequireAuthorization();

        cards.MapGet("/{id:int}/labels", async (int id, AppDbContext db) => Results.Ok(Api.Ok(await CardLabels(db, id))));
        cards.MapPost("/{id:int}/labels", async (int id, LabelToggle request, AppDbContext db) =>
        {
            var link = await db.CardLabels.SingleOrDefaultAsync(x => x.CardId == id && x.LabelId == request.LabelId);
            var added = link is null;
            if (added) db.CardLabels.Add(new CardLabel { CardId = id, LabelId = request.LabelId }); else db.CardLabels.Remove(link!);
            await db.SaveChangesAsync(); return Results.Ok(Api.Ok(new { added }));
        });

        cards.MapGet("/{id:int}/members", async (int id, AppDbContext db) => Results.Ok(Api.Ok(await CardMembers(db, id))));
        cards.MapPost("/{id:int}/members", async (int id, HttpRequest request, AppDbContext db) =>
        {
            var userId = await request.ReadFromJsonAsync<int>();
            var link = await db.CardMembers.SingleOrDefaultAsync(x => x.CardId == id && x.UserId == userId);
            var added = link is null;
            if (added) db.CardMembers.Add(new CardMember { CardId = id, UserId = userId }); else db.CardMembers.Remove(link!);
            await db.SaveChangesAsync(); return Results.Ok(Api.Ok(new { added }));
        });

        cards.MapGet("/{id:int}/checklists", async (int id, AppDbContext db) => Results.Ok(Api.Ok(await ChecklistDtos(db, id))));
        cards.MapPost("/{id:int}/checklists", async (int id, ChecklistWrite request, HttpContext http, AppDbContext db) =>
        {
            var position = (await db.Checklists.Where(x => x.CardId == id).MaxAsync(x => (int?)x.Position) ?? -1) + 1;
            var checklist = new Checklist { CardId = id, Name = request.Name.Trim(), Position = position };
            db.Checklists.Add(checklist); await db.SaveChangesAsync();
            if (request.CopyFromChecklistId.HasValue)
            {
                var sourceItems = await db.ChecklistItems.Where(x => x.ChecklistId == request.CopyFromChecklistId).OrderBy(x => x.Position).ToListAsync();
                db.ChecklistItems.AddRange(sourceItems.Select(x => new ChecklistItem { ChecklistId = checklist.Id, Name = x.Name, Position = x.Position, DueDate = x.DueDate, AssignedUserId = x.AssignedUserId }));
                await db.SaveChangesAsync();
            }
            await AddActivity(db, id, Api.UserId(http.User)!.Value, $"added checklist {checklist.Name}");
            return Results.Created($"/api/checklist/{checklist.Id}", Api.Ok((await ChecklistDtos(db, id)).Single(x => x.Id == checklist.Id)));
        });

        cards.MapGet("/{id:int}/comments", async (int id, AppDbContext db) => Results.Ok(Api.Ok(await CommentDtos(db, id))));
        cards.MapPost("/{id:int}/comments", async (int id, CommentWrite request, HttpContext http, AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Content)) return Results.BadRequest();
            var uid = Api.UserId(http.User)!.Value;
            var comment = new CardComment { CardId = id, UserId = uid, Content = request.Content.Trim() };
            db.CardComments.Add(comment); await db.SaveChangesAsync();
            await AddActivity(db, id, uid, "commented on this card");
            return Results.Created($"/api/card/{id}/comments/{comment.Id}", Api.Ok((await CommentDtos(db, id)).Single(x => x.Id == comment.Id)));
        });
        cards.MapDelete("/{id:int}/comments/{commentId:int}", async (int id, int commentId, HttpContext http, AppDbContext db) =>
        {
            var comment = await db.CardComments.SingleOrDefaultAsync(x => x.Id == commentId && x.CardId == id);
            if (comment is null) return Results.NotFound();
            if (comment.UserId != Api.UserId(http.User)) return Results.Forbid();
            db.CardComments.Remove(comment); await db.SaveChangesAsync(); return Results.NoContent();
        });

        cards.MapGet("/{id:int}/attachments", async (int id, AppDbContext db) => Results.Ok(Api.Ok(await AttachmentDtos(db, id))));
        cards.MapPost("/{id:int}/attachments", async (int id, HttpRequest request, HttpContext http, AppDbContext db) =>
        {
            var stored = await SaveUpload(request, Api.UserId(http.User)!.Value, db);
            if (stored is null) return Results.BadRequest(new { message = $"A file up to {MaxUploadBytes / 1024 / 1024} MB is required." });
            var attachment = new CardAttachment { CardId = id, FileId = stored.Id, UserId = stored.UserId, Name = stored.Name };
            db.CardAttachments.Add(attachment); await db.SaveChangesAsync();
            await AddActivity(db, id, stored.UserId, $"attached {stored.Name}");
            return Results.Created($"/api/card/{id}/attachments/{attachment.Id}", Api.Ok((await AttachmentDtos(db, id)).Single(x => x.Id == attachment.Id)));
        }).DisableAntiforgery();
        cards.MapDelete("/{id:int}/attachments/{attachmentId:int}", async (int id, int attachmentId, AppDbContext db) =>
        {
            var attachment = await db.CardAttachments.SingleOrDefaultAsync(x => x.Id == attachmentId && x.CardId == id);
            if (attachment is null) return Results.NotFound();
            db.CardAttachments.Remove(attachment); await db.SaveChangesAsync(); return Results.NoContent();
        });

        cards.MapGet("/{id:int}/links", async (int id, AppDbContext db) => Results.Ok(Api.Ok(await LinkDtos(db, id))));
        cards.MapPost("/{id:int}/links", async (int id, CardLinkWrite request, AppDbContext db) =>
        {
            if (id == request.LinkedCardId) return Results.BadRequest(new { message = "A card cannot link to itself." });
            var existing = await db.CardLinks.SingleOrDefaultAsync(x => x.CardId == id && x.LinkedCardId == request.LinkedCardId);
            if (existing is not null) return Results.Conflict(new { message = "This card is already linked." });
            var link = new CardLink { CardId = id, LinkedCardId = request.LinkedCardId };
            db.CardLinks.Add(link); await db.SaveChangesAsync();
            return Results.Created($"/api/card/{id}/links/{link.Id}", Api.Ok((await LinkDtos(db, id)).Last()));
        });
        cards.MapDelete("/{id:int}/links/{linkId:int}", async (int id, int linkId, AppDbContext db) =>
        {
            var link = await db.CardLinks.SingleOrDefaultAsync(x => x.Id == linkId && x.CardId == id);
            if (link is null) return Results.NotFound(); db.CardLinks.Remove(link); await db.SaveChangesAsync(); return Results.NoContent();
        });
    }

    private static void MapChecklistFeatures(RouteGroupBuilder api)
    {
        api.MapPost("/checklist/{id:int}/items", async (int id, ChecklistItemWrite request, AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name)) return Results.BadRequest();
            var position = (await db.ChecklistItems.Where(x => x.ChecklistId == id).MaxAsync(x => (int?)x.Position) ?? -1) + 1;
            var item = new ChecklistItem { ChecklistId = id, Name = request.Name.Trim(), Position = position, DueDate = request.DueDate, AssignedUserId = request.AssignedUserId };
            db.ChecklistItems.Add(item); await db.SaveChangesAsync(); return Results.Created($"/api/checklist/items/{item.Id}", Api.Ok(ItemDto(item)));
        }).RequireAuthorization();
        api.MapPut("/checklist/items/{id:int}", async (int id, ChecklistItemPatch request, AppDbContext db) =>
        {
            var item = await db.ChecklistItems.FindAsync(id); if (item is null) return Results.NotFound();
            if (request.Name is not null) item.Name = request.Name.Trim(); if (request.IsChecked.HasValue) item.IsChecked = request.IsChecked.Value;
            if (request.DueDate.HasValue) item.DueDate = request.DueDate; if (request.AssignedUserId.HasValue) item.AssignedUserId = request.AssignedUserId;
            await db.SaveChangesAsync(); return Results.Ok(Api.Ok(ItemDto(item)));
        }).RequireAuthorization();
        api.MapDelete("/checklist/items/{id:int}", async (int id, AppDbContext db) =>
        {
            var item = await db.ChecklistItems.FindAsync(id); if (item is null) return Results.NotFound(); db.ChecklistItems.Remove(item); await db.SaveChangesAsync(); return Results.NoContent();
        }).RequireAuthorization();
        api.MapDelete("/checklist/{id:int}", async (int id, AppDbContext db) =>
        {
            var checklist = await db.Checklists.FindAsync(id); if (checklist is null) return Results.NotFound(); db.Checklists.Remove(checklist); await db.SaveChangesAsync(); return Results.NoContent();
        }).RequireAuthorization();
    }

    private static void MapBugFeatures(RouteGroupBuilder api)
    {
        var cards = api.MapGroup("/card").RequireAuthorization();
        cards.MapGet("/{id:int}/bugs", async (int id, AppDbContext db) => Results.Ok(Api.Ok(await BugDtos(db, id))));
        cards.MapPost("/{id:int}/bugs", async (int id, BugWrite request, HttpContext http, AppDbContext db) =>
        {
            if (!ValidBug(request)) return Results.BadRequest(new { message = "Title, reproduction steps, expected result, actual result, and a valid severity are required." });
            var bug = NewBug(id, request); db.CardBugs.Add(bug); await db.SaveChangesAsync();
            db.BugHistories.Add(new BugHistory { BugId = bug.Id, UserId = Api.UserId(http.User), Message = "Bug reported" });
            await AddActivity(db, id, Api.UserId(http.User)!.Value, $"reported BUG-{bug.Id}: {bug.Title}");
            return Results.Created($"/api/bug/{bug.Id}", Api.Ok(await BugDto(db, bug)));
        });

        var bugs = api.MapGroup("/bug").RequireAuthorization();
        bugs.MapGet("/{id:int}", async (int id, AppDbContext db) =>
        {
            var bug = await db.CardBugs.FindAsync(id); return bug is null ? Results.NotFound() : Results.Ok(Api.Ok(await BugDto(db, bug)));
        });
        bugs.MapPut("/{id:int}", async (int id, BugWrite request, HttpContext http, AppDbContext db) =>
        {
            var bug = await db.CardBugs.FindAsync(id); if (bug is null) return Results.NotFound(); if (!ValidBug(request)) return Results.BadRequest();
            ApplyBug(bug, request); db.BugHistories.Add(new BugHistory { BugId = id, UserId = Api.UserId(http.User), Message = "Bug details updated" });
            await db.SaveChangesAsync(); return Results.Ok(Api.Ok(await BugDto(db, bug)));
        });
        bugs.MapPost("/{id:int}/transition", async (int id, BugTransition request, HttpContext http, AppDbContext db) =>
        {
            var bug = await db.CardBugs.FindAsync(id); if (bug is null) return Results.NotFound();
            var transition = request.Action.ToLowerInvariant() switch
            {
                "start" => ("In Progress", (string?)null, "Work started"),
                "submit" => ("Ready for Retest", (string?)null, "Submitted for retest"),
                "verify" => ("Closed", "Fixed", "Fix verified"),
                "close" => ("Closed", request.Resolution ?? "Deferred", "Bug closed"),
                "reopen" => ("Open", (string?)null, string.IsNullOrWhiteSpace(request.Reason) ? "Bug reopened" : $"Bug reopened: {request.Reason}"),
                _ => ((string?)null, null, "")
            };
            if (transition.Item1 is null) return Results.BadRequest(new { message = "Unknown bug transition." });
            bug.Status = transition.Item1; bug.Resolution = transition.Item2;
            db.BugHistories.Add(new BugHistory { BugId = id, UserId = Api.UserId(http.User), Message = transition.Item3 });
            await db.SaveChangesAsync();
            await AddActivity(db, bug.CardId, Api.UserId(http.User)!.Value, $"changed BUG-{bug.Id} to {bug.Status}");
            return Results.Ok(Api.Ok(await BugDto(db, bug)));
        });
        bugs.MapPost("/{id:int}/attachments", async (int id, HttpRequest request, HttpContext http, AppDbContext db) =>
        {
            var bug = await db.CardBugs.FindAsync(id); if (bug is null) return Results.NotFound();
            var stored = await SaveUpload(request, Api.UserId(http.User)!.Value, db); if (stored is null) return Results.BadRequest();
            var attachment = new BugAttachment { BugId = id, FileId = stored.Id, Name = stored.Name, Status = bug.Status };
            db.BugAttachments.Add(attachment); db.BugHistories.Add(new BugHistory { BugId = id, UserId = stored.UserId, Message = $"Attached {stored.Name}" });
            await db.SaveChangesAsync(); return Results.Created($"/api/bug/{id}/attachments/{attachment.Id}", Api.Ok(AttachmentDto(attachment, stored)));
        }).DisableAntiforgery();
        bugs.MapDelete("/{id:int}/attachments/{attachmentId:int}", async (int id, int attachmentId, AppDbContext db) =>
        {
            var attachment = await db.BugAttachments.SingleOrDefaultAsync(x => x.Id == attachmentId && x.BugId == id);
            if (attachment is null) return Results.NotFound(); db.BugAttachments.Remove(attachment); await db.SaveChangesAsync(); return Results.NoContent();
        });
    }

    internal static async Task<List<object>> CardDtos(AppDbContext db, IEnumerable<Card> cards)
    {
        var result = new List<object>();
        foreach (var card in cards) result.Add(await CardDto(db, card, false));
        return result;
    }

    internal static async Task<object> CardDto(AppDbContext db, Card card, bool includeActivities)
    {
        var labels = await CardLabels(db, card.Id);
        var members = await CardMembers(db, card.Id);
        var commentCount = await db.CardComments.CountAsync(x => x.CardId == card.Id);
        var attachmentCount = await db.CardAttachments.CountAsync(x => x.CardId == card.Id);
        var checklistItemCount = await (from item in db.ChecklistItems join checklist in db.Checklists on item.ChecklistId equals checklist.Id where checklist.CardId == card.Id select item).CountAsync();
        var checklistItemCheckedCount = await (from item in db.ChecklistItems join checklist in db.Checklists on item.ChecklistId equals checklist.Id where checklist.CardId == card.Id && item.IsChecked select item).CountAsync();
        var linkedCardCount = await db.CardLinks.CountAsync(x => x.CardId == card.Id);
        var bugCount = await db.CardBugs.CountAsync(x => x.CardId == card.Id);
        var openBugCount = await db.CardBugs.CountAsync(x => x.CardId == card.Id && x.Status != "Closed");
        var activities = includeActivities ? await ActivityDtos(db, card.Id) : null;
        var createdByName = await UserName(db, card.CreatedById);
        var updatedByName = await UserName(db, card.UpdatedById);
        return new { card.Id, card.Title, card.Description, card.ListId, card.Position, card.CoverColor, card.CoverImage, card.SequenceNumber, card.DueDate, card.DueComplete, card.IsArchived, card.TaskId, card.CreatedById, card.UpdatedById, createdByName, updatedByName, card.CreatedAt, card.UpdatedAt, labels, members, assignees = members, commentCount, attachmentCount, checklistItemCount, checklistItemCheckedCount, linkedCardCount, bugCount, openBugCount, activities };
    }

    internal static async Task<List<object>> BoardMembers(AppDbContext db, int boardId, int ownerId)
    {
        var memberships = await db.BoardMembers.Where(x => x.BoardId == boardId).ToListAsync();
        if (memberships.All(x => x.UserId != ownerId)) memberships.Insert(0, new BoardMember { Id = 0, BoardId = boardId, UserId = ownerId, Role = "owner" });
        var result = new List<object>(); foreach (var member in memberships) result.Add(await MemberDto(db, member)); return result;
    }

    internal static async Task<List<object>> BoardLabels(AppDbContext db, int boardId) =>
        (await db.BoardLabels.Where(x => x.BoardId == boardId).OrderBy(x => x.Name).ToListAsync()).Select(LabelDto).Cast<object>().ToList();

    private static async Task<object> MemberDto(AppDbContext db, BoardMember member)
    {
        var user = await db.Users.FindAsync(member.UserId);
        return new { member.Id, member.UserId, member.Role, user = user is null ? null : new { user.Id, user.Username, user.Email, user.FirstName, user.LastName, avatarId = (int?)null, avatarUrl = (string?)null } };
    }

    private static object LabelDto(BoardLabel x) => new { x.Id, x.Name, x.Color, x.BoardId };
    private static async Task<List<object>> CardLabels(AppDbContext db, int cardId)
    {
        var rows = await (from link in db.CardLabels join label in db.BoardLabels on link.LabelId equals label.Id where link.CardId == cardId orderby label.Name select new { label.Id, label.Name, label.Color, label.BoardId }).ToListAsync();
        return rows.Cast<object>().ToList();
    }
    private static async Task<List<object>> CardMembers(AppDbContext db, int cardId)
    {
        var rows = await (from link in db.CardMembers join user in db.Users on link.UserId equals user.Id where link.CardId == cardId orderby user.FirstName select new { id = user.Id, user.FirstName, user.LastName, user.Email, avatarId = (int?)null, avatarUrl = (string?)null }).ToListAsync();
        return rows.Cast<object>().ToList();
    }

    private static async Task<List<ChecklistDto>> ChecklistDtos(AppDbContext db, int cardId)
    {
        var checklists = await db.Checklists.Where(x => x.CardId == cardId).OrderBy(x => x.Position).ToListAsync();
        var result = new List<ChecklistDto>();
        foreach (var checklist in checklists)
        {
            var rows = await db.ChecklistItems.Where(x => x.ChecklistId == checklist.Id).OrderBy(x => x.Position).ToListAsync();
            var items = rows.Select(ItemDto).ToList();
            result.Add(new ChecklistDto(checklist.Id, checklist.Name, checklist.CardId, checklist.Position, checklist.CreatedAt, items));
        }
        return result;
    }

    private static object ItemDto(ChecklistItem x) => new { x.Id, x.Name, x.ChecklistId, x.IsChecked, x.Position, x.DueDate, x.AssignedUserId, x.CreatedAt };
    private static async Task<List<CommentDto>> CommentDtos(AppDbContext db, int cardId) => await
        (from comment in db.CardComments join user in db.Users on comment.UserId equals user.Id where comment.CardId == cardId orderby comment.CreatedAt
         select new CommentDto(comment.Id, comment.Content, comment.CardId, comment.UserId, user.FirstName, user.LastName, null, comment.CreatedAt, comment.UpdatedAt)).ToListAsync();
    private static async Task<List<AttachmentResponse>> AttachmentDtos(AppDbContext db, int cardId) => await
        (from attachment in db.CardAttachments join file in db.StoredFiles on attachment.FileId equals file.Id where attachment.CardId == cardId orderby attachment.CreatedAt descending
         select new AttachmentResponse(attachment.Id, attachment.Name, $"/api/files/{file.Id}", file.Id, file.Size, attachment.CardId, attachment.UserId, attachment.CreatedAt)).ToListAsync();
    private static async Task<List<object>> ActivityDtos(AppDbContext db, int cardId)
    {
        var rows = await (from activity in db.CardActivities join user in db.Users on activity.UserId equals user.Id where activity.CardId == cardId orderby activity.CreatedAt descending
                          select new { activity.Id, activity.CardId, activity.UserId, activity.Action, activity.Data, user.FirstName, user.LastName, avatarUrl = (string?)null, activity.CreatedAt }).ToListAsync();
        return rows.Cast<object>().ToList();
    }
    private static async Task<List<object>> LinkDtos(AppDbContext db, int cardId)
    {
        var links = await db.CardLinks.Where(x => x.CardId == cardId).OrderBy(x => x.Id).ToListAsync(); var result = new List<object>();
        foreach (var link in links)
        {
            var row = await (from card in db.Cards join list in db.BoardLists on card.ListId equals list.Id join board in db.Boards on list.BoardId equals board.Id where card.Id == link.LinkedCardId
                             select new { link.Id, linkedCardId = card.Id, card.Title, boardId = (int?)board.Id, boardName = board.Name, listName = list.Name, card.IsArchived, card.DueComplete, card.DueDate, boardBackground = board.Background, hasDescription = card.Description != null && card.Description != "" }).SingleAsync();
            var labels = await CardLabels(db, link.LinkedCardId);
            var members = await CardMembers(db, link.LinkedCardId);
            var commentCount = await db.CardComments.CountAsync(x => x.CardId == link.LinkedCardId);
            var attachmentCount = await db.CardAttachments.CountAsync(x => x.CardId == link.LinkedCardId);
            var checklistItemCount = await (from item in db.ChecklistItems join checklist in db.Checklists on item.ChecklistId equals checklist.Id where checklist.CardId == link.LinkedCardId select item).CountAsync();
            var checklistItemCheckedCount = await (from item in db.ChecklistItems join checklist in db.Checklists on item.ChecklistId equals checklist.Id where checklist.CardId == link.LinkedCardId && item.IsChecked select item).CountAsync();
            var linkedCardCount = await db.CardLinks.CountAsync(x => x.CardId == link.LinkedCardId);
            result.Add(new { row.Id, row.linkedCardId, row.Title, row.boardId, row.boardName, row.listName, row.IsArchived, row.DueComplete, row.DueDate, row.boardBackground, row.hasDescription, labels, members, commentCount, attachmentCount, checklistItemCount, checklistItemCheckedCount, linkedCardCount });
        }
        return result;
    }

    internal static async Task AddActivity(AppDbContext db, int cardId, int userId, string action)
    {
        db.CardActivities.Add(new CardActivity { CardId = cardId, UserId = userId, Action = action }); await db.SaveChangesAsync();
    }

    private static async Task<StoredFile?> SaveUpload(HttpRequest request, int userId, AppDbContext db)
    {
        if (!request.HasFormContentType) return null; var form = await request.ReadFormAsync(); var upload = form.Files.GetFile("file");
        if (upload is null || upload.Length <= 0 || upload.Length > MaxUploadBytes) return null;
        await using var stream = new MemoryStream(); await upload.CopyToAsync(stream);
        var file = new StoredFile { UserId = userId, Name = Path.GetFileName(upload.FileName), ContentType = string.IsNullOrWhiteSpace(upload.ContentType) ? "application/octet-stream" : upload.ContentType, Size = upload.Length, Data = stream.ToArray() };
        db.StoredFiles.Add(file); await db.SaveChangesAsync(); return file;
    }

    private static async Task<IResult> DownloadFile(int id, AppDbContext db)
    {
        var file = await db.StoredFiles.FindAsync(id); return file is null ? Results.NotFound() : Results.File(file.Data, file.ContentType, file.Name, enableRangeProcessing: true);
    }

    private static async Task<List<object>> BugDtos(AppDbContext db, int cardId)
    {
        var bugs = await db.CardBugs.Where(x => x.CardId == cardId).OrderByDescending(x => x.CreatedAt).ToListAsync(); var result = new List<object>();
        foreach (var bug in bugs) result.Add(await BugDto(db, bug)); return result;
    }

    private static async Task<object> BugDto(AppDbContext db, CardBug bug)
    {
        var reporter = bug.ReporterId.HasValue ? await db.Users.FindAsync(bug.ReporterId.Value) : null;
        var assignee = bug.AssigneeId.HasValue ? await db.Users.FindAsync(bug.AssigneeId.Value) : null;
        var history = await (from entry in db.BugHistories join user0 in db.Users on entry.UserId equals user0.Id into users from user in users.DefaultIfEmpty() where entry.BugId == bug.Id orderby entry.CreatedAt descending
                             select new { entry.Id, entry.Message, entry.UserId, firstName = user == null ? null : user.FirstName, lastName = user == null ? null : user.LastName, entry.CreatedAt }).ToListAsync();
        var attachmentRows = await (from attachment in db.BugAttachments join file in db.StoredFiles on attachment.FileId equals file.Id where attachment.BugId == bug.Id orderby attachment.CreatedAt descending select new { attachment, file }).ToListAsync();
        var attachments = attachmentRows.Select(x => AttachmentDto(x.attachment, x.file)).ToList();
        return new { bug.Id, bug.CardId, bug.Title, bug.StepsToReproduce, bug.ExpectedResult, bug.ActualResult, bug.Description, bug.Severity, bug.Priority, bug.Environment, bug.Team, bug.ReporterId, reporterFirstName = reporter == null ? null : reporter.FirstName, reporterLastName = reporter == null ? null : reporter.LastName, bug.ReporterName, bug.AssigneeId, assigneeFirstName = assignee == null ? null : assignee.FirstName, assigneeLastName = assignee == null ? null : assignee.LastName, assigneeAvatarId = (int?)null, bug.AssigneeTeam, bug.Status, bug.Resolution, bug.CreatedAt, bug.UpdatedAt, history, attachments };
    }

    private static object AttachmentDto(BugAttachment attachment, StoredFile file) => new { attachment.Id, attachment.Name, url = $"/api/files/{file.Id}", fileId = (int?)file.Id, size = (long?)file.Size, attachment.Status, attachment.CreatedAt };
    private static CardBug NewBug(int cardId, BugWrite request) { var bug = new CardBug { CardId = cardId }; ApplyBug(bug, request); return bug; }
    private static void ApplyBug(CardBug bug, BugWrite request) { bug.Title = request.Title.Trim(); bug.StepsToReproduce = request.StepsToReproduce.Trim(); bug.ExpectedResult = request.ExpectedResult.Trim(); bug.ActualResult = request.ActualResult.Trim(); bug.Description = request.Description; bug.Severity = request.Severity; bug.Priority = Blank(request.Priority); bug.Environment = Blank(request.Environment); bug.Team = Blank(request.Team); bug.ReporterId = request.ReporterId; bug.ReporterName = Blank(request.ReporterName); bug.AssigneeId = request.AssigneeId; bug.AssigneeTeam = Blank(request.AssigneeTeam); }
    private static bool ValidBug(BugWrite request) => !string.IsNullOrWhiteSpace(request.Title) && !string.IsNullOrWhiteSpace(request.StepsToReproduce) && !string.IsNullOrWhiteSpace(request.ExpectedResult) && !string.IsNullOrWhiteSpace(request.ActualResult) && request.Severity is "Critical" or "Major" or "Medium" or "Low";
    private static string? Blank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static string ValidRole(string? role) => role is "admin" ? "admin" : "member";
    private static async Task<string?> UserName(AppDbContext db, int? userId)
    {
        if (!userId.HasValue) return null;
        var user = await db.Users.FindAsync(userId.Value);
        if (user is null) return null;
        return string.Join(" ", new[] { user.FirstName, user.LastName }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim() is { Length: > 0 } name ? name : user.Username;
    }
}

public sealed record BoardMemberWrite(int UserId, string? Role);
public sealed record BoardMemberRole(string? Role);
public sealed record LabelWrite(string Name, string Color);
public sealed record LabelToggle(int LabelId);
public sealed record ChecklistWrite(string Name, int? CopyFromChecklistId);
public sealed record ChecklistItemWrite(string Name, DateTime? DueDate, int? AssignedUserId);
public sealed record ChecklistItemPatch(string? Name, bool? IsChecked, DateTime? DueDate, int? AssignedUserId);
public sealed record CommentWrite(string Content);
public sealed record CardLinkWrite(int LinkedCardId);
public sealed record BugWrite(string Title, string StepsToReproduce, string ExpectedResult, string ActualResult, string? Description, string Severity, string? Priority, string? Environment, string? Team, int? ReporterId, string? ReporterName, int? AssigneeId, string? AssigneeTeam);
public sealed record BugTransition(string Action, string? Resolution, string? Reason);
public sealed record ChecklistDto(int Id, string Name, int CardId, int Position, DateTime CreatedAt, List<object> Items);
public sealed record CommentDto(int Id, string Content, int CardId, int UserId, string? FirstName, string? LastName, string? AvatarUrl, DateTime CreatedAt, DateTime UpdatedAt);
public sealed record AttachmentResponse(int Id, string Name, string Url, int FileId, long? Size, int CardId, int UserId, DateTime CreatedAt);
