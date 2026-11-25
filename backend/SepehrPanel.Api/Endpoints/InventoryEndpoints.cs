using Microsoft.EntityFrameworkCore;
using SepehrPanel.Api.Data;
using SepehrPanel.Api.Models;

namespace SepehrPanel.Api.Endpoints;

public static class InventoryEndpoints
{
    private static readonly string[] Statuses = ["Available", "Assigned", "In Maintenance", "Reserved", "Retired"];
    private static readonly string[] Conditions = ["New", "Good", "Fair", "Poor", "Damaged"];

    public static void MapInventory(this RouteGroupBuilder api)
    {
        var inventory = api.MapGroup("/inventory").RequireAuthorization();

        inventory.MapGet("/", async (string? q, string? category, string? status, string? location, int? assignedToUserId, AppDbContext db) =>
        {
            var query = db.InventoryItems.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim().ToLower();
                query = query.Where(x => x.Name.ToLower().Contains(term) || x.Sku.ToLower().Contains(term) ||
                    (x.AssetTag != null && x.AssetTag.ToLower().Contains(term)) || (x.SerialNumber != null && x.SerialNumber.ToLower().Contains(term)) ||
                    (x.Manufacturer != null && x.Manufacturer.ToLower().Contains(term)) || (x.Model != null && x.Model.ToLower().Contains(term)));
            }
            if (!string.IsNullOrWhiteSpace(category)) query = query.Where(x => x.Category == category);
            if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.Status == status);
            if (!string.IsNullOrWhiteSpace(location)) query = query.Where(x => x.Location == location);
            if (assignedToUserId.HasValue) query = query.Where(x => x.AssignedToUserId == assignedToUserId);
            var rows = await query.OrderBy(x => x.Name).ToListAsync();
            return Results.Ok(Api.Ok(await Dtos(db, rows)));
        });

        inventory.MapGet("/summary", async (AppDbContext db) =>
        {
            var rows = await db.InventoryItems.AsNoTracking().ToListAsync();
            return Results.Ok(Api.Ok(new
            {
                totalItems = rows.Count,
                totalUnits = rows.Sum(x => x.Quantity),
                available = rows.Count(x => x.Status == "Available"),
                assigned = rows.Count(x => x.Status == "Assigned"),
                inMaintenance = rows.Count(x => x.Status == "In Maintenance"),
                lowStock = rows.Count(x => x.Quantity <= x.MinimumQuantity),
                totalValue = rows.Sum(x => x.Quantity * (x.PurchasePrice ?? 0)),
                categories = rows.GroupBy(x => x.Category).OrderByDescending(x => x.Count()).Select(x => new { name = x.Key, count = x.Count() })
            }));
        });

        inventory.MapGet("/filters", async (AppDbContext db) => Results.Ok(Api.Ok(new
        {
            statuses = Statuses,
            conditions = Conditions,
            categories = await db.InventoryItems.Select(x => x.Category).Distinct().OrderBy(x => x).ToListAsync(),
            locations = await db.InventoryItems.Where(x => x.Location != null).Select(x => x.Location!).Distinct().OrderBy(x => x).ToListAsync(),
            users = await db.Users.Where(x => x.IsActive).OrderBy(x => x.FirstName).ThenBy(x => x.LastName)
                .Select(x => new { x.Id, name = (x.FirstName + " " + x.LastName).Trim(), x.Username }).ToListAsync()
        })));

        inventory.MapGet("/{id:int}/activity", async (int id, AppDbContext db) =>
        {
            if (!await db.InventoryItems.AnyAsync(x => x.Id == id)) return Results.NotFound();
            var rows = await (from activity in db.InventoryActivities
                              join user in db.Users on activity.UserId equals user.Id
                              where activity.InventoryItemId == id
                              orderby activity.CreatedAt descending
                              select new { activity.Id, activity.Action, activity.Details, activity.UserId, userName = (user.FirstName + " " + user.LastName).Trim(), activity.CreatedAt }).ToListAsync();
            return Results.Ok(Api.Ok(rows));
        });

        inventory.MapPost("/", async (InventoryWrite request, HttpContext http, AppDbContext db) =>
        {
            var error = await Validate(request, null, db); if (error is not null) return Results.BadRequest(new { message = error });
            var uid = Api.UserId(http.User)!.Value;
            var item = Apply(new InventoryItem { CreatedById = uid }, request, uid);
            db.InventoryItems.Add(item); await db.SaveChangesAsync();
            db.InventoryActivities.Add(new InventoryActivity { InventoryItemId = item.Id, UserId = uid, Action = "Created", Details = $"Registered {item.Name} ({item.Sku})" });
            await db.SaveChangesAsync();
            return Results.Created($"/api/inventory/{item.Id}", Api.Ok(await Dto(db, item)));
        });

        inventory.MapPut("/{id:int}", async (int id, InventoryWrite request, HttpContext http, AppDbContext db) =>
        {
            var item = await db.InventoryItems.FindAsync(id); if (item is null) return Results.NotFound();
            var error = await Validate(request, id, db); if (error is not null) return Results.BadRequest(new { message = error });
            var oldStatus = item.Status; var oldAssignee = item.AssignedToUserId; var oldQuantity = item.Quantity;
            var uid = Api.UserId(http.User)!.Value; Apply(item, request, uid);
            var changes = new List<string>();
            if (oldStatus != item.Status) changes.Add($"status: {oldStatus} to {item.Status}");
            if (oldAssignee != item.AssignedToUserId) changes.Add("assignment changed");
            if (oldQuantity != item.Quantity) changes.Add($"quantity: {oldQuantity} to {item.Quantity}");
            db.InventoryActivities.Add(new InventoryActivity { InventoryItemId = item.Id, UserId = uid, Action = "Updated", Details = changes.Count > 0 ? string.Join(", ", changes) : "Equipment details updated" });
            await db.SaveChangesAsync(); return Results.Ok(Api.Ok(await Dto(db, item)));
        });

        inventory.MapPost("/{id:int}/adjust-stock", async (int id, StockAdjustment request, HttpContext http, AppDbContext db) =>
        {
            var item = await db.InventoryItems.FindAsync(id); if (item is null) return Results.NotFound();
            if (item.Quantity + request.Change < 0) return Results.BadRequest(new { message = "Stock cannot be negative." });
            if (request.Change == 0) return Results.BadRequest(new { message = "Enter a non-zero stock change." });
            var before = item.Quantity; var uid = Api.UserId(http.User)!.Value;
            item.Quantity += request.Change; item.UpdatedById = uid;
            db.InventoryActivities.Add(new InventoryActivity { InventoryItemId = id, UserId = uid, Action = request.Change > 0 ? "Stock received" : "Stock issued", Details = $"{before} to {item.Quantity} {item.Unit}. {request.Reason}".Trim() });
            await db.SaveChangesAsync(); return Results.Ok(Api.Ok(await Dto(db, item)));
        });

        inventory.MapDelete("/{id:int}", async (int id, HttpContext http, AppDbContext db) =>
        {
            var item = await db.InventoryItems.FindAsync(id); if (item is null) return Results.NotFound();
            var uid = Api.UserId(http.User)!.Value;
            if (item.CreatedById != uid && !http.User.IsInRole("admin")) return Results.Forbid();
            db.InventoryItems.Remove(item); await db.SaveChangesAsync(); return Results.NoContent();
        });
    }

    private static InventoryItem Apply(InventoryItem item, InventoryWrite request, int uid)
    {
        item.Sku = request.Sku.Trim().ToUpperInvariant(); item.AssetTag = Clean(request.AssetTag)?.ToUpperInvariant(); item.Name = request.Name.Trim();
        item.Description = Clean(request.Description); item.Category = request.Category.Trim(); item.Manufacturer = Clean(request.Manufacturer); item.Model = Clean(request.Model);
        item.SerialNumber = Clean(request.SerialNumber); item.Status = request.Status; item.Condition = request.Condition; item.Quantity = request.Quantity;
        item.MinimumQuantity = request.MinimumQuantity; item.Unit = request.Unit.Trim(); item.Location = Clean(request.Location); item.Department = Clean(request.Department);
        item.AssignedToUserId = request.AssignedToUserId; item.Supplier = Clean(request.Supplier); item.PurchaseDate = request.PurchaseDate;
        item.PurchasePrice = request.PurchasePrice; item.WarrantyExpiry = request.WarrantyExpiry; item.ImageUrl = Clean(request.ImageUrl); item.Notes = Clean(request.Notes); item.UpdatedById = uid;
        return item;
    }

    private static async Task<string?> Validate(InventoryWrite request, int? id, AppDbContext db)
    {
        if (string.IsNullOrWhiteSpace(request.Sku) || string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Category) || string.IsNullOrWhiteSpace(request.Unit)) return "SKU, name, category, and unit are required.";
        if (request.Quantity < 0 || request.MinimumQuantity < 0 || request.PurchasePrice < 0) return "Quantity, minimum stock, and price cannot be negative.";
        if (!Statuses.Contains(request.Status)) return "Select a valid equipment status.";
        if (!Conditions.Contains(request.Condition)) return "Select a valid equipment condition.";
        var sku = request.Sku.Trim().ToUpperInvariant(); var tag = Clean(request.AssetTag)?.ToUpperInvariant();
        if (await db.InventoryItems.AnyAsync(x => x.Id != id && x.Sku == sku)) return "An equipment item with this SKU already exists.";
        if (tag is not null && await db.InventoryItems.AnyAsync(x => x.Id != id && x.AssetTag == tag)) return "An equipment item with this asset tag already exists.";
        if (request.AssignedToUserId.HasValue && !await db.Users.AnyAsync(x => x.Id == request.AssignedToUserId && x.IsActive)) return "The selected assignee is not active.";
        return null;
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static async Task<List<object>> Dtos(AppDbContext db, IEnumerable<InventoryItem> items)
    {
        var result = new List<object>(); foreach (var item in items) result.Add(await Dto(db, item)); return result;
    }

    private static async Task<object> Dto(AppDbContext db, InventoryItem item)
    {
        var creator = await db.Users.FindAsync(item.CreatedById); var updater = await db.Users.FindAsync(item.UpdatedById);
        var assignee = item.AssignedToUserId.HasValue ? await db.Users.FindAsync(item.AssignedToUserId.Value) : null;
        return new { item.Id, item.Sku, item.AssetTag, item.Name, item.Description, item.Category, item.Manufacturer, item.Model, item.SerialNumber, item.Status, item.Condition,
            item.Quantity, item.MinimumQuantity, item.Unit, item.Location, item.Department, item.AssignedToUserId, assignedToName = Name(assignee), item.Supplier,
            item.PurchaseDate, item.PurchasePrice, item.WarrantyExpiry, item.ImageUrl, item.Notes, item.CreatedById, createdByName = Name(creator),
            item.UpdatedById, updatedByName = Name(updater), item.CreatedAt, item.UpdatedAt, isLowStock = item.Quantity <= item.MinimumQuantity,
            stockValue = item.Quantity * (item.PurchasePrice ?? 0), warrantyExpired = item.WarrantyExpiry.HasValue && item.WarrantyExpiry.Value.Date < DateTime.UtcNow.Date };
    }

    private static string? Name(User? user) => user is null ? null : string.Join(" ", new[] { user.FirstName, user.LastName }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim() is { Length: > 0 } name ? name : user.Username;
}

public sealed class InventoryWrite
{
    public string Sku { get; set; } = ""; public string? AssetTag { get; set; } public string Name { get; set; } = ""; public string? Description { get; set; }
    public string Category { get; set; } = "Other"; public string? Manufacturer { get; set; } public string? Model { get; set; } public string? SerialNumber { get; set; }
    public string Status { get; set; } = "Available"; public string Condition { get; set; } = "Good"; public decimal Quantity { get; set; } public decimal MinimumQuantity { get; set; }
    public string Unit { get; set; } = "pcs"; public string? Location { get; set; } public string? Department { get; set; } public int? AssignedToUserId { get; set; }
    public string? Supplier { get; set; } public DateTime? PurchaseDate { get; set; } public decimal? PurchasePrice { get; set; } public DateTime? WarrantyExpiry { get; set; }
    public string? ImageUrl { get; set; } public string? Notes { get; set; }
}

public sealed record StockAdjustment(decimal Change, string? Reason);
