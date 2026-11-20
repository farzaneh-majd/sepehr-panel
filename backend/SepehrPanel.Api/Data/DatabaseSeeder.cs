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
}
