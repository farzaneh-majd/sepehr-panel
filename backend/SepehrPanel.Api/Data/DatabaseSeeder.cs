using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SepehrPanel.Api.Models;

namespace SepehrPanel.Api.Data;

public sealed class DatabaseSeeder(AppDbContext db, IPasswordHasher<User> passwordHasher, IConfiguration configuration)
{
    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        if (!await db.Database.CanConnectAsync(cancellationToken)) return;

        var admin = await db.Users.FirstOrDefaultAsync(x => x.Username == "admin", cancellationToken);
        if (admin is null)
        {
            admin = new User
            {
                Username = "admin", Email = "admin@sepehr.local", FirstName = "Sepehr",
                LastName = "Admin", Role = "admin"
            };
            admin.PasswordHash = passwordHasher.HashPassword(admin, configuration["Seed:AdminPassword"] ?? "ChangeMe123!");
            db.Users.Add(admin);
            await db.SaveChangesAsync(cancellationToken);
        }

        var userOne = await EnsureUser("sepehr.one", "sepehr.one@sepehr.local", "Sepehr", "One", configuration["Seed:UserOnePassword"] ?? "SepehrOne123!", cancellationToken);
        var userTwo = await EnsureUser("sepehr.two", "sepehr.two@sepehr.local", "Sepehr", "Two", configuration["Seed:UserTwoPassword"] ?? "SepehrTwo123!", cancellationToken);

        var teamPassword = configuration["Seed:TeamPassword"] ?? "123456789";
        var teamUsers = new[]
        {
            ("SinaSafizadeh", "Sina", "Safizadeh", "user"),
            ("AmirhosseinKhodabakhsh", "Amirhossein", "Khodabakhsh", "admin"),
            ("AliTorkamanasadi", "Ali", "Torkamanasadi", "admin"),
            ("ParhamMonfared", "Parham", "Monfared", "user"),
            ("MohammadMahdavi", "Mohammad", "Mahdavi", "user"),
            ("FarzanehMajd", "Farzaneh", "Majd", "admin"),
            ("AliMoradi83", "Ali", "Moradi 83", "user"),
            ("AliMoradi81", "Ali", "Moradi 81", "user"),
            ("DanialRezaei", "Danial", "Rezaei", "user"),
            ("RohamKavei", "Roham", "Kavei", "user"),
            ("MohammadNazerieh", "Mohammad", "Nazerieh", "user"),
            ("SarinaKashani", "Sarina", "Kashani", "user"),
            ("AmirPouyanniya", "Amir", "Pouyanniya", "user"),
            ("AmirhosseinGhotbabadi", "Amirhossein", "Ghotbabadi", "user")
        };
        foreach (var (username, firstName, lastName, role) in teamUsers)
        {
            await EnsureUser(username, $"{username.ToLowerInvariant()}@local.sepehr", firstName, lastName, teamPassword, cancellationToken, role);
        }

        if (!await db.InventoryItems.AnyAsync(cancellationToken))
        {
            var laptop = new InventoryItem { Sku = "SEP-LAP-001", AssetTag = "AST-1001", Name = "Developer Laptop", Description = "Primary engineering workstation", Category = "Computers", Manufacturer = "Dell", Model = "Latitude 5540", SerialNumber = "DL-5540-001", Status = "Assigned", Condition = "Good", Quantity = 1, MinimumQuantity = 0, Unit = "pcs", Location = "Main Office", Department = "Engineering", AssignedToUserId = userOne.Id, Supplier = "Technology Partner", PurchaseDate = DateTime.UtcNow.Date.AddMonths(-8), PurchasePrice = 1250, WarrantyExpiry = DateTime.UtcNow.Date.AddMonths(16), CreatedById = userOne.Id, UpdatedById = userOne.Id };
            var headset = new InventoryItem { Sku = "SEP-HDS-001", AssetTag = "AST-1002", Name = "USB Headset", Description = "Noise-cancelling team headset", Category = "Accessories", Manufacturer = "Logitech", Model = "Zone Vibe", SerialNumber = "LV-002", Status = "Available", Condition = "New", Quantity = 8, MinimumQuantity = 2, Unit = "pcs", Location = "IT Storage", Department = "Operations", Supplier = "Office Supplier", PurchaseDate = DateTime.UtcNow.Date.AddMonths(-2), PurchasePrice = 95, WarrantyExpiry = DateTime.UtcNow.Date.AddMonths(22), CreatedById = userTwo.Id, UpdatedById = userTwo.Id };
            db.InventoryItems.AddRange(laptop, headset);
            await db.SaveChangesAsync(cancellationToken);
            db.InventoryActivities.AddRange(
                new InventoryActivity { InventoryItemId = laptop.Id, UserId = userOne.Id, Action = "Created", Details = "Registered and assigned the engineering laptop" },
                new InventoryActivity { InventoryItemId = headset.Id, UserId = userTwo.Id, Action = "Created", Details = "Registered initial accessory stock" });
            await db.SaveChangesAsync(cancellationToken);
        }

        if (!await db.Issues.AnyAsync(cancellationToken))
        {
            db.Issues.AddRange(new[]
            {
                NewIssue("SEP-101", "Set up the team workspace", "TO DO", "SETUP", "High", "FP", admin.Id),
                NewIssue("SEP-102", "Review project requirements", "TO DO", "PLANNING", "Medium", "AM", admin.Id),
                NewIssue("SEP-103", "Create initial sprint backlog", "TO DO", "PLANNING", "Low", "SK", admin.Id),
                NewIssue("SEP-104", "Implement board layout", "IN PROGRESS", "FRONTEND", "High", "FP", admin.Id),
                NewIssue("SEP-105", "Prepare future integration plan", "IN PROGRESS", "BACKEND", "Medium", "AM", admin.Id),
                NewIssue("SEP-106", "Review task card styling", "IN REVIEW", "DESIGN", "Medium", "SK", admin.Id),
                NewIssue("SEP-107", "Initialize Next.js project", "DONE", "SETUP", "Low", "FP", admin.Id)
            });
            await db.SaveChangesAsync(cancellationToken);
        }
    }

    private static Issue NewIssue(string key, string title, string status, string label, string priority, string assignee, int creatorId) =>
        new() { Key = key, Title = title, Status = status, Label = label, Priority = priority, Assignee = assignee, CreatorId = creatorId };

    private async Task<User> EnsureUser(string username, string email, string firstName, string lastName, string password, CancellationToken cancellationToken, string role = "user")
    {
        var user = await db.Users.FirstOrDefaultAsync(x => x.Username == username, cancellationToken);
        if (user is not null) return user;
        user = new User { Username = username, Email = email, FirstName = firstName, LastName = lastName, Role = role, IsActive = true };
        user.PasswordHash = passwordHasher.HashPassword(user, password);
        db.Users.Add(user); await db.SaveChangesAsync(cancellationToken); return user;
    }
}
