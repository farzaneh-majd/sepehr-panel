using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using SepehrPanel.Api.Data;
using SepehrPanel.Api.Models;
using SepehrPanel.Api.Services;

namespace SepehrPanel.Api.Endpoints;

public static class SepehrEndpoints
{
    private static readonly string[] DefaultBoardListNames = { "TO DO", "IN PROGRESS", "DONE" };

    public static void MapSepehrApi(this WebApplication app)
    {
        var api = app.MapGroup("/api");
        MapAuth(api);
        MapIssues(api, app.Configuration.GetValue("Demo:AllowAnonymousIssues", false));
        MapUsers(api);
        MapProjects(api);
        MapBoards(api);
        MapCards(api);
        api.MapKanbanFeatures();
        api.MapInventory();
        MapTimeEntries(api);
    }

    private static void MapAuth(RouteGroupBuilder api)
    {
        api.MapPost("/login", async (LoginRequest request, AppDbContext db, IPasswordHasher<User> hasher, TokenService tokens) =>
        {
            var login = request.Username.Trim().ToLowerInvariant();
            var user = await db.Users.SingleOrDefaultAsync(x => x.Username.ToLower() == login || x.Email.ToLower() == login);
            if (user is null || hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password) == PasswordVerificationResult.Failed)
                return Results.Unauthorized();
            if (!user.IsActive) return Results.Json(new { message = "User is deactivated" }, statusCode: 401);
            var access = tokens.CreateAccessToken(user);
            var refresh = tokens.CreateRefreshToken();
            db.RefreshTokens.Add(new RefreshToken { UserId = user.Id, TokenHash = refresh.Hash, ExpiresAt = refresh.ExpiresAt });
            await db.SaveChangesAsync();
            return Results.Ok(Api.Ok(new { access, refresh = refresh.Raw }));
        }).AllowAnonymous();

        api.MapPost("/refresh", async (RefreshRequest request, AppDbContext db, TokenService tokens) =>
        {
            var hash = TokenService.Hash(request.Refresh);
            var stored = await db.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == hash);
            if (stored is null || stored.RevokedAt is not null || stored.ExpiresAt <= DateTime.UtcNow) return Results.Unauthorized();
            var user = await db.Users.FindAsync(stored.UserId);
            if (user is null || !user.IsActive) return Results.Unauthorized();
            stored.RevokedAt = DateTime.UtcNow;
            var next = tokens.CreateRefreshToken();
            db.RefreshTokens.Add(new RefreshToken { UserId = user.Id, TokenHash = next.Hash, ExpiresAt = next.ExpiresAt });
            await db.SaveChangesAsync();
            return Results.Ok(Api.Ok(new { access = tokens.CreateAccessToken(user), refresh = next.Raw }));
        }).AllowAnonymous();
    }

    private static void MapIssues(RouteGroupBuilder api, bool allowAnonymous)
    {
        var group = api.MapGroup("/issues");
        group.MapGet("/", async (AppDbContext db) => Results.Ok(Api.Ok(await db.Issues.OrderBy(x => x.Id).Select(IssueDto.Expression).ToListAsync())));
        group.MapPost("/", async (IssueWrite request, HttpContext http, AppDbContext db) =>
        {
            if (!ValidStatus(request.Status) || !ValidPriority(request.Priority) || string.IsNullOrWhiteSpace(request.Title)) return Results.BadRequest(new { message = "Invalid issue data." });
            var keys = await db.Issues.Select(x => x.Key).ToListAsync();
            var lastNumber = keys.Select(x => int.TryParse(x.Split('-').LastOrDefault(), out var number) ? number : 100).DefaultIfEmpty(100).Max();
            var issue = new Issue
            {
                Key = $"SEP-{lastNumber + 1}", Title = request.Title.Trim(), Status = request.Status,
                Label = request.Label.Trim().ToUpperInvariant(), Priority = request.Priority, Assignee = request.Assignee.Trim().ToUpperInvariant(),
                CreatorId = Api.UserId(http.User) ?? await db.Users.Where(x => x.Username == "admin").Select(x => x.Id).FirstAsync()
            };
            db.Issues.Add(issue); await db.SaveChangesAsync();
            return Results.Created($"/api/issues/{issue.Id}", Api.Ok(IssueDto.From(issue)));
        });
        group.MapPut("/{id:int}", async (int id, IssueWrite request, AppDbContext db) =>
        {
            var issue = await db.Issues.FindAsync(id); if (issue is null) return Results.NotFound();
            if (!ValidStatus(request.Status) || !ValidPriority(request.Priority) || string.IsNullOrWhiteSpace(request.Title)) return Results.BadRequest();
            issue.Title = request.Title.Trim(); issue.Status = request.Status; issue.Label = request.Label.Trim().ToUpperInvariant();
            issue.Priority = request.Priority; issue.Assignee = request.Assignee.Trim().ToUpperInvariant();
            await db.SaveChangesAsync(); return Results.Ok(Api.Ok(IssueDto.From(issue)));
        });
        group.MapDelete("/{id:int}", async (int id, AppDbContext db) =>
        {
            var issue = await db.Issues.FindAsync(id); if (issue is null) return Results.NotFound();
            db.Issues.Remove(issue); await db.SaveChangesAsync(); return Results.NoContent();
        });
        if (allowAnonymous) group.AllowAnonymous(); else group.RequireAuthorization();
    }

    private static void MapUsers(RouteGroupBuilder api)
    {
        api.MapGet("/user", async (HttpContext http, AppDbContext db) =>
        {
            var user = await db.Users.FindAsync(Api.UserId(http.User));
            return user is null ? Results.Unauthorized() : Results.Ok(Api.Ok(UserDto(user)));
        }).RequireAuthorization();
        api.MapGet("/user/all", async (AppDbContext db) => Results.Ok(Api.Ok(await db.Users.OrderBy(x => x.FirstName).Select(x => new
        {
            x.Id, x.Username, x.Email, x.FirstName, x.LastName, x.Role, x.IsActive, x.CreatedAt, x.UpdatedAt
        }).ToListAsync()))).RequireAuthorization();
        api.MapPost("/user", async (UserCreate request, AppDbContext db, IPasswordHasher<User> hasher) =>
        {
            if (await db.Users.AnyAsync(x => x.Username == request.Username || x.Email == request.Email)) return Results.Conflict(new { message = "Username or email already exists." });
            var user = new User { Username = request.Username.Trim(), Email = request.Email.Trim(), FirstName = request.FirstName, LastName = request.LastName, Role = request.Role ?? "user" };
            user.PasswordHash = hasher.HashPassword(user, request.Password); db.Users.Add(user); await db.SaveChangesAsync();
            return Results.Created($"/api/user/{user.Id}", Api.Ok(UserDto(user)));
        }).RequireAuthorization(policy => policy.RequireRole("admin"));
    }

    private static void MapProjects(RouteGroupBuilder api)
    {
        var projects = api.MapGroup("/project").RequireAuthorization();
        projects.MapGet("/", async (HttpContext http, AppDbContext db) =>
        {
            var uid = Api.UserId(http.User)!.Value;
            var rows = await db.Projects.Where(x => x.OwnerId == uid || x.IsPublic || db.ProjectMembers.Any(m => m.ProjectId == x.Id && m.UserId == uid))
                .OrderByDescending(x => x.UpdatedAt).Select(x => new { x.Id, x.Name, x.Description, x.Color, userId = x.OwnerId, x.IsPublic, x.IsBillable, x.IsArchived, x.CreatedAt, x.UpdatedAt, trackedTime = db.TimeEntries.Where(t => t.ProjectId == x.Id).Sum(t => (int?)t.Duration) ?? 0 }).ToListAsync();
            return Results.Ok(Api.Ok(rows));
        });
        projects.MapGet("/{id:int}", async (int id, AppDbContext db) =>
        {
            var x = await db.Projects.FindAsync(id); return x is null ? Results.NotFound() : Results.Ok(Api.Ok(ProjectDto(x)));
        });
        projects.MapPost("/", async (ProjectWrite request, HttpContext http, AppDbContext db) =>
        {
            var uid = Api.UserId(http.User)!.Value;
            if (await db.Projects.AnyAsync(x => x.OwnerId == uid && x.Name == request.Name)) return Results.BadRequest(new { message = "Project name already exists." });
            var x = new Project { Name = request.Name.Trim(), Description = request.Description, Color = request.Color ?? "#3b82f6", IsPublic = request.IsPublic, IsBillable = request.IsBillable, IsArchived = request.IsArchived, OwnerId = uid };
            db.Projects.Add(x); await db.SaveChangesAsync(); return Results.Created($"/api/project/{x.Id}", Api.Ok(ProjectDto(x)));
        });
        projects.MapPut("/{id:int}", async (int id, ProjectPatch request, HttpContext http, AppDbContext db) =>
        {
            var x = await db.Projects.FindAsync(id); if (x is null) return Results.NotFound(); if (x.OwnerId != Api.UserId(http.User)) return Results.Forbid();
            if (request.Name is not null) x.Name = request.Name.Trim(); if (request.Description is not null) x.Description = request.Description;
            if (request.Color is not null) x.Color = request.Color; if (request.IsPublic.HasValue) x.IsPublic = request.IsPublic.Value;
            if (request.IsBillable.HasValue) x.IsBillable = request.IsBillable.Value; if (request.IsArchived.HasValue) x.IsArchived = request.IsArchived.Value;
            await db.SaveChangesAsync(); return Results.Ok(Api.Ok(ProjectDto(x)));
        });
        projects.MapDelete("/{id:int}", async (int id, HttpContext http, AppDbContext db) =>
        {
            var x = await db.Projects.FindAsync(id); if (x is null) return Results.NotFound(); if (x.OwnerId != Api.UserId(http.User)) return Results.Forbid();
            db.Projects.Remove(x); await db.SaveChangesAsync(); return Results.NoContent();
        });

        var tasks = api.MapGroup("/task").RequireAuthorization();
        tasks.MapGet("/", async (int? projectId, AppDbContext db) => Results.Ok(Api.Ok(await db.Tasks.Where(x => !projectId.HasValue || x.ProjectId == projectId).OrderBy(x => x.Id).ToListAsync())));
        tasks.MapPost("/", async (TaskWrite request, HttpContext http, AppDbContext db) =>
        {
            var x = new WorkTask { Name = request.Name.Trim(), Description = request.Description, ProjectId = request.ProjectId, CreatorId = Api.UserId(http.User)!.Value };
            db.Tasks.Add(x); await db.SaveChangesAsync(); return Results.Created($"/api/task/{x.Id}", Api.Ok(x));
        });
        tasks.MapPut("/{id:int}", async (int id, TaskPatch request, AppDbContext db) =>
        {
            var x = await db.Tasks.FindAsync(id); if (x is null) return Results.NotFound();
            if (request.Name is not null) x.Name = request.Name; if (request.Description is not null) x.Description = request.Description;
            if (request.Status is not null) { x.Status = request.Status; x.IsCompleted = request.Status == "done"; }
            await db.SaveChangesAsync(); return Results.Ok(Api.Ok(x));
        });
        tasks.MapDelete("/{id:int}", async (int id, AppDbContext db) => { var x = await db.Tasks.FindAsync(id); if (x is null) return Results.NotFound(); db.Tasks.Remove(x); await db.SaveChangesAsync(); return Results.NoContent(); });
    }

    private static void MapBoards(RouteGroupBuilder api)
    {
        var boards = api.MapGroup("/board").RequireAuthorization();
        boards.MapGet("/", async (HttpContext http, AppDbContext db) =>
        {
            var uid = Api.UserId(http.User)!.Value;
            var rows = await db.Boards.Where(x => x.OwnerId == uid || db.BoardMembers.Any(m => m.BoardId == x.Id && m.UserId == uid)).OrderByDescending(x => x.UpdatedAt).ToListAsync();
            return Results.Ok(Api.Ok(rows.Select(BoardDto)));
        });
        boards.MapPost("/", async (BoardWrite request, HttpContext http, AppDbContext db) =>
        {
            var uid = Api.UserId(http.User)!.Value;
            var x = new Board { Name = request.Name.Trim(), Description = request.Description, Background = request.Background ?? "#0052cc", Visibility = request.Visibility ?? "private", ProjectId = request.ProjectId, OwnerId = uid, CreatedById = uid, UpdatedById = uid };
            db.Boards.Add(x); await db.SaveChangesAsync();
            db.BoardMembers.Add(new BoardMember { BoardId = x.Id, UserId = x.OwnerId, Role = "owner" });
            db.BoardLists.AddRange(DefaultBoardListNames.Select((name, position) => new BoardList
            {
                BoardId = x.Id,
                Name = name,
                Position = position,
                CreatedById = uid,
                UpdatedById = uid
            }));
            await db.SaveChangesAsync();
            return Results.Created($"/api/board/{x.Id}", Api.Ok(BoardDto(x)));
        });
        boards.MapGet("/{id:int}/detail", async (int id, AppDbContext db) =>
        {
            var board = await db.Boards.FindAsync(id); if (board is null) return Results.NotFound();
            var members = await KanbanFeatureEndpoints.BoardMembers(db, id, board.OwnerId);
            var labels = await KanbanFeatureEndpoints.BoardLabels(db, id);
            return Results.Ok(Api.Ok(new { board.Id, board.Name, board.Description, board.Background, board.Visibility, board.AutoNumberCards, userId = board.OwnerId, board.ProjectId, board.IsStarred, board.IsClosed, board.CreatedById, board.UpdatedById, board.CreatedAt, board.UpdatedAt, members, labels }));
        });
        boards.MapGet("/{id:int}/lists", async (int id, AppDbContext db) =>
        {
            var lists = await db.BoardLists.Where(x => x.BoardId == id && !x.IsDeleted).OrderBy(x => x.Position).ToListAsync();
            var cards = await db.Cards.Where(x => lists.Select(l => l.Id).Contains(x.ListId) && !x.IsDeleted).OrderBy(x => x.Position).ToListAsync();
            var result = new List<object>();
            foreach (var list in lists) result.Add(new { list.Id, list.Name, list.BoardId, list.Position, list.IsArchived, list.CreatedAt, list.UpdatedAt, cards = await KanbanFeatureEndpoints.CardDtos(db, cards.Where(c => c.ListId == list.Id)) });
            return Results.Ok(Api.Ok(result));
        });
        boards.MapPost("/{id:int}/lists", async (int id, NameRequest request, HttpContext http, AppDbContext db) =>
        {
            var position = await db.BoardLists.Where(x => x.BoardId == id).Select(x => (int?)x.Position).MaxAsync() ?? -1;
            var uid = Api.UserId(http.User)!.Value;
            var x = new BoardList { BoardId = id, Name = request.Name.Trim(), Position = position + 1, CreatedById = uid, UpdatedById = uid }; db.BoardLists.Add(x); await db.SaveChangesAsync(); return Results.Created($"/api/lists/{x.Id}", Api.Ok(x));
        });
        boards.MapPut("/{id:int}", async (int id, BoardPatch request, HttpContext http, AppDbContext db) =>
        {
            var x = await db.Boards.FindAsync(id); if (x is null) return Results.NotFound(); if (x.OwnerId != Api.UserId(http.User)) return Results.Forbid();
            if (request.Name is not null) x.Name = request.Name; if (request.Description is not null) x.Description = request.Description; if (request.Background is not null) x.Background = request.Background;
            if (request.Visibility is not null) x.Visibility = request.Visibility; if (request.IsStarred.HasValue) x.IsStarred = request.IsStarred.Value; if (request.IsClosed.HasValue) x.IsClosed = request.IsClosed.Value;
            if (request.AutoNumberCards.HasValue) x.AutoNumberCards = request.AutoNumberCards.Value;
            x.UpdatedById = Api.UserId(http.User);
            await db.SaveChangesAsync(); return Results.Ok(Api.Ok(BoardDto(x)));
        });
        boards.MapMethods("/{id:int}", ["PATCH"], async (int id, BoardPatch request, HttpContext http, AppDbContext db) =>
        {
            var x = await db.Boards.FindAsync(id); if (x is null) return Results.NotFound(); if (x.OwnerId != Api.UserId(http.User)) return Results.Forbid(); if (request.IsStarred.HasValue) x.IsStarred = request.IsStarred.Value; x.UpdatedById = Api.UserId(http.User); await db.SaveChangesAsync(); return Results.Ok(Api.Ok(BoardDto(x)));
        });
        boards.MapDelete("/{id:int}", async (int id, HttpContext http, AppDbContext db) => { var x = await db.Boards.FindAsync(id); if (x is null) return Results.NotFound(); if (x.OwnerId != Api.UserId(http.User)) return Results.Forbid(); db.Boards.Remove(x); await db.SaveChangesAsync(); return Results.NoContent(); });

        api.MapPut("/lists/{id:int}", async (int id, ListPatch request, HttpContext http, AppDbContext db) => { var x = await db.BoardLists.FindAsync(id); if (x is null) return Results.NotFound(); if (request.Name is not null) x.Name = request.Name; if (request.Position.HasValue) x.Position = request.Position.Value; if (request.IsArchived.HasValue) x.IsArchived = request.IsArchived.Value; x.UpdatedById = Api.UserId(http.User); await db.SaveChangesAsync(); return Results.Ok(Api.Ok(x)); }).RequireAuthorization();
        api.MapDelete("/lists/{id:int}", async (int id, HttpContext http, AppDbContext db) => { var x = await db.BoardLists.FindAsync(id); if (x is null) return Results.NotFound(); x.IsDeleted = true; x.DeletedAt = DateTime.UtcNow; x.UpdatedById = Api.UserId(http.User); await db.SaveChangesAsync(); return Results.NoContent(); }).RequireAuthorization();
    }

    private static void MapCards(RouteGroupBuilder api)
    {
        var cards = api.MapGroup("/card").RequireAuthorization();
        cards.MapPost("/", async (CardWrite request, HttpContext http, AppDbContext db) =>
        {
            var position = request.Position ?? ((await db.Cards.Where(x => x.ListId == request.ListId).Select(x => (int?)x.Position).MaxAsync() ?? -1) + 1);
            var board = await (from list in db.BoardLists join b in db.Boards on list.BoardId equals b.Id where list.Id == request.ListId select b).SingleAsync();
            var sequence = board.AutoNumberCards ? (await (from card in db.Cards join list in db.BoardLists on card.ListId equals list.Id where list.BoardId == board.Id select card.SequenceNumber).MaxAsync() ?? 0) + 1 : (int?)null;
            var uid = Api.UserId(http.User)!.Value;
            var x = new Card { Title = request.Title.Trim(), Description = request.Description, ListId = request.ListId, Position = position, DueDate = request.DueDate, TaskId = request.TaskId, SequenceNumber = sequence, CreatedById = uid, UpdatedById = uid };
            db.Cards.Add(x); await db.SaveChangesAsync();
            await KanbanFeatureEndpoints.AddActivity(db, x.Id, Api.UserId(http.User)!.Value, "created this card");
            return Results.Created($"/api/card/{x.Id}", Api.Ok(await KanbanFeatureEndpoints.CardDto(db, x, false)));
        });
        cards.MapGet("/{id:int}", async (int id, AppDbContext db) => { var x = await db.Cards.FindAsync(id); return x is null ? Results.NotFound() : Results.Ok(Api.Ok(await KanbanFeatureEndpoints.CardDto(db, x, true))); });
        cards.MapPut("/{id:int}", async (int id, CardPatch request, HttpContext http, AppDbContext db) =>
        {
            var x = await db.Cards.FindAsync(id); if (x is null) return Results.NotFound(); if (request.Title is not null) x.Title = request.Title; if (request.Description is not null) x.Description = request.Description;
            if (request.DueDate.HasValue || request.ClearDueDate || request.DueDateSet) x.DueDate = request.ClearDueDate ? null : request.DueDate; if (request.DueComplete.HasValue) x.DueComplete = request.DueComplete.Value; if (request.IsArchived.HasValue) x.IsArchived = request.IsArchived.Value;
            if (request.CoverColorSet) x.CoverColor = request.CoverColor; if (request.CoverImageSet) x.CoverImage = request.CoverImage;
            x.UpdatedById = Api.UserId(http.User);
            await db.SaveChangesAsync();
            await KanbanFeatureEndpoints.AddActivity(db, x.Id, Api.UserId(http.User)!.Value, request.IsArchived.HasValue ? (x.IsArchived ? "archived this card" : "restored this card") : "updated this card");
            return Results.Ok(Api.Ok(await KanbanFeatureEndpoints.CardDto(db, x, false)));
        });
        cards.MapPost("/{id:int}/move", async (int id, MoveCard request, HttpContext http, AppDbContext db) =>
        {
            var x = await db.Cards.FindAsync(id); if (x is null) return Results.NotFound();
            var sourceListId = x.ListId;
            var source = await db.Cards.Where(c => c.ListId == sourceListId && c.Id != id && !c.IsDeleted).OrderBy(c => c.Position).ThenBy(c => c.Id).ToListAsync();
            var destination = sourceListId == request.ListId ? source : await db.Cards.Where(c => c.ListId == request.ListId && c.Id != id && !c.IsDeleted).OrderBy(c => c.Position).ThenBy(c => c.Id).ToListAsync();
            var target = Math.Clamp(request.Position, 0, destination.Count); destination.Insert(target, x);
            x.ListId = request.ListId;
            x.UpdatedById = Api.UserId(http.User);
            for (var i = 0; i < destination.Count; i++) destination[i].Position = i;
            if (sourceListId != request.ListId) for (var i = 0; i < source.Count; i++) source[i].Position = i;
            await db.SaveChangesAsync();
            await KanbanFeatureEndpoints.AddActivity(db, x.Id, Api.UserId(http.User)!.Value, "moved this card");
            return Results.Ok(Api.Ok(await KanbanFeatureEndpoints.CardDto(db, x, false)));
        });
        cards.MapDelete("/{id:int}", async (int id, HttpContext http, AppDbContext db) => { var x = await db.Cards.FindAsync(id); if (x is null) return Results.NotFound(); x.IsDeleted = true; x.DeletedAt = DateTime.UtcNow; x.UpdatedById = Api.UserId(http.User); await db.SaveChangesAsync(); await KanbanFeatureEndpoints.AddActivity(db, x.Id, Api.UserId(http.User)!.Value, "moved this card to trash"); return Results.NoContent(); });
    }

    private static void MapTimeEntries(RouteGroupBuilder api)
    {
        var entries = api.MapGroup("/time-entry").RequireAuthorization();
        entries.MapGet("/", async (DateTime? startDate, DateTime? endDate, HttpContext http, AppDbContext db) =>
        {
            var uid = Api.UserId(http.User)!.Value; var query = db.TimeEntries.Where(x => x.UserId == uid);
            if (startDate.HasValue) query = query.Where(x => x.StartTime >= startDate.Value); if (endDate.HasValue) query = query.Where(x => x.StartTime <= endDate.Value);
            return Results.Ok(Api.Ok(await query.OrderByDescending(x => x.StartTime).ToListAsync()));
        });
        entries.MapPost("/", async (TimeEntryWrite request, HttpContext http, AppDbContext db) => { var x = new TimeEntry { UserId = Api.UserId(http.User)!.Value, Description = request.Description, ProjectId = request.ProjectId, TaskId = request.TaskId, StartTime = request.StartTime, EndTime = request.EndTime, Duration = request.Duration ?? Duration(request.StartTime, request.EndTime), IsBillable = request.IsBillable }; db.TimeEntries.Add(x); await db.SaveChangesAsync(); return Results.Created($"/api/time-entry/{x.Id}", Api.Ok(x)); });
        entries.MapPut("/{id:int}", async (int id, TimeEntryWrite request, HttpContext http, AppDbContext db) => { var x = await db.TimeEntries.FindAsync(id); if (x is null) return Results.NotFound(); if (x.UserId != Api.UserId(http.User)) return Results.Forbid(); x.Description = request.Description; x.ProjectId = request.ProjectId; x.TaskId = request.TaskId; x.StartTime = request.StartTime; x.EndTime = request.EndTime; x.Duration = request.Duration ?? Duration(request.StartTime, request.EndTime); x.IsBillable = request.IsBillable; await db.SaveChangesAsync(); return Results.Ok(Api.Ok(x)); });
        entries.MapDelete("/{id:int}", async (int id, HttpContext http, AppDbContext db) => { var x = await db.TimeEntries.FindAsync(id); if (x is null) return Results.NotFound(); if (x.UserId != Api.UserId(http.User)) return Results.Forbid(); db.TimeEntries.Remove(x); await db.SaveChangesAsync(); return Results.NoContent(); });
    }

    private static bool ValidStatus(string value) => value is "TO DO" or "IN PROGRESS" or "IN REVIEW" or "DONE";
    private static bool ValidPriority(string value) => value is "Low" or "Medium" or "High";
    private static int? Duration(DateTime start, DateTime? end) => end.HasValue ? Math.Max(0, (int)(end.Value - start).TotalSeconds) : null;
    private static object UserDto(User x) => new { x.Id, x.Username, x.Email, x.FirstName, x.LastName, x.Role, x.IsActive, x.CreatedAt, x.UpdatedAt };
    private static object ProjectDto(Project x) => new { x.Id, x.Name, x.Description, x.Color, userId = x.OwnerId, x.IsPublic, x.IsBillable, x.IsArchived, x.CreatedAt, x.UpdatedAt };
    private static object BoardDto(Board x) => new { x.Id, x.Name, x.Description, x.Background, x.Visibility, x.AutoNumberCards, userId = x.OwnerId, x.ProjectId, x.IsStarred, x.IsClosed, x.CreatedById, x.UpdatedById, x.CreatedAt, x.UpdatedAt };
    private static object CardDto(Card x) => new { x.Id, x.Title, x.Description, x.ListId, x.Position, x.CoverColor, x.CoverImage, x.SequenceNumber, x.DueDate, x.DueComplete, x.IsArchived, x.TaskId, x.CreatedAt, x.UpdatedAt };
}

public sealed record LoginRequest(string Username, string Password);
public sealed record RefreshRequest(string Refresh);
public sealed record UserCreate(string Username, string Email, string Password, string? FirstName, string? LastName, string? Role);
public sealed record IssueWrite(string Title, string Status, string Label, string Priority, string Assignee);
public sealed record ProjectWrite(string Name, string? Description, string? Color, bool IsPublic = true, bool IsBillable = true, bool IsArchived = false);
public sealed record ProjectPatch(string? Name, string? Description, string? Color, bool? IsPublic, bool? IsBillable, bool? IsArchived);
public sealed record TaskWrite(string Name, string? Description, int ProjectId);
public sealed record TaskPatch(string? Name, string? Description, string? Status);
public sealed record BoardWrite(string Name, string? Description, string? Background, string? Visibility, int? ProjectId);
public sealed record BoardPatch(string? Name, string? Description, string? Background, string? Visibility, bool? IsStarred, bool? IsClosed, bool? AutoNumberCards);
public sealed record NameRequest(string Name);
public sealed record ListPatch(string? Name, int? Position, bool? IsArchived);
public sealed record CardWrite(string Title, string? Description, int ListId, int? Position, DateTime? DueDate, int? TaskId);
public sealed record CardPatch(string? Title, string? Description, DateTime? DueDate, bool DueDateSet, bool ClearDueDate, bool? DueComplete, bool? IsArchived, string? CoverColor, bool CoverColorSet, string? CoverImage, bool CoverImageSet);
public sealed record MoveCard(int ListId, int Position);
public sealed record TimeEntryWrite(string? Description, int? ProjectId, int? TaskId, DateTime StartTime, DateTime? EndTime, int? Duration, bool IsBillable);

public sealed record IssueDto(int Id, string Key, string Title, string Status, string Label, string Priority, string Assignee, int? ProjectId, DateTime CreatedAt, DateTime UpdatedAt)
{
    public static readonly System.Linq.Expressions.Expression<Func<Issue, IssueDto>> Expression = x => new(x.Id, x.Key, x.Title, x.Status, x.Label, x.Priority, x.Assignee, x.ProjectId, x.CreatedAt, x.UpdatedAt);
    public static IssueDto From(Issue x) => new(x.Id, x.Key, x.Title, x.Status, x.Label, x.Priority, x.Assignee, x.ProjectId, x.CreatedAt, x.UpdatedAt);
}

internal static class Api
{
    public static object Ok(object? result) => new { result };
    public static int? UserId(ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
}
