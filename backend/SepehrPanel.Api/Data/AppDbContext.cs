using Microsoft.EntityFrameworkCore;
using SepehrPanel.Api.Models;

namespace SepehrPanel.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
    public DbSet<WorkTask> Tasks => Set<WorkTask>();
    public DbSet<Board> Boards => Set<Board>();
    public DbSet<BoardMember> BoardMembers => Set<BoardMember>();
    public DbSet<BoardList> BoardLists => Set<BoardList>();
    public DbSet<Card> Cards => Set<Card>();
    public DbSet<BoardLabel> BoardLabels => Set<BoardLabel>();
    public DbSet<CardLabel> CardLabels => Set<CardLabel>();
    public DbSet<CardMember> CardMembers => Set<CardMember>();
    public DbSet<Checklist> Checklists => Set<Checklist>();
    public DbSet<ChecklistItem> ChecklistItems => Set<ChecklistItem>();
    public DbSet<CardComment> CardComments => Set<CardComment>();
    public DbSet<StoredFile> StoredFiles => Set<StoredFile>();
    public DbSet<CardAttachment> CardAttachments => Set<CardAttachment>();
    public DbSet<CardActivity> CardActivities => Set<CardActivity>();
    public DbSet<CardLink> CardLinks => Set<CardLink>();
    public DbSet<CardBug> CardBugs => Set<CardBug>();
    public DbSet<BugHistory> BugHistories => Set<BugHistory>();
    public DbSet<BugAttachment> BugAttachments => Set<BugAttachment>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<InventoryActivity> InventoryActivities => Set<InventoryActivity>();
    public DbSet<Issue> Issues => Set<Issue>();
    public DbSet<TimeEntry> TimeEntries => Set<TimeEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(x => x.Username).IsUnique();
        modelBuilder.Entity<User>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<RefreshToken>().HasIndex(x => x.TokenHash).IsUnique();
        modelBuilder.Entity<ProjectMember>().HasIndex(x => new { x.ProjectId, x.UserId }).IsUnique();
        modelBuilder.Entity<BoardMember>().HasIndex(x => new { x.BoardId, x.UserId }).IsUnique();
        modelBuilder.Entity<Issue>().HasIndex(x => x.Key).IsUnique();
        modelBuilder.Entity<BoardList>().HasIndex(x => new { x.BoardId, x.Position });
        modelBuilder.Entity<Card>().HasIndex(x => new { x.ListId, x.Position });
        modelBuilder.Entity<CardLabel>().HasIndex(x => new { x.CardId, x.LabelId }).IsUnique();
        modelBuilder.Entity<CardMember>().HasIndex(x => new { x.CardId, x.UserId }).IsUnique();
        modelBuilder.Entity<CardLink>().HasIndex(x => new { x.CardId, x.LinkedCardId }).IsUnique();
        modelBuilder.Entity<BoardLabel>().HasIndex(x => new { x.BoardId, x.Name }).IsUnique();
        modelBuilder.Entity<InventoryItem>().HasIndex(x => x.Sku).IsUnique();
        modelBuilder.Entity<InventoryItem>().HasIndex(x => x.AssetTag).IsUnique();
        modelBuilder.Entity<RefreshToken>().HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Project>().HasOne<User>().WithMany().HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ProjectMember>().HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ProjectMember>().HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<WorkTask>().HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<WorkTask>().HasOne<User>().WithMany().HasForeignKey(x => x.CreatorId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Board>().HasOne<User>().WithMany().HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Board>().HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Board>().HasOne<User>().WithMany().HasForeignKey(x => x.CreatedById).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Board>().HasOne<User>().WithMany().HasForeignKey(x => x.UpdatedById).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BoardMember>().HasOne<Board>().WithMany().HasForeignKey(x => x.BoardId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<BoardMember>().HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BoardList>().HasOne<Board>().WithMany().HasForeignKey(x => x.BoardId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<BoardList>().HasOne<User>().WithMany().HasForeignKey(x => x.CreatedById).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BoardList>().HasOne<User>().WithMany().HasForeignKey(x => x.UpdatedById).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Card>().HasOne<BoardList>().WithMany().HasForeignKey(x => x.ListId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Card>().HasOne<WorkTask>().WithMany().HasForeignKey(x => x.TaskId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Card>().HasOne<User>().WithMany().HasForeignKey(x => x.CreatedById).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Card>().HasOne<User>().WithMany().HasForeignKey(x => x.UpdatedById).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BoardLabel>().HasOne<Board>().WithMany().HasForeignKey(x => x.BoardId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<CardLabel>().HasOne<Card>().WithMany().HasForeignKey(x => x.CardId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<CardLabel>().HasOne<BoardLabel>().WithMany().HasForeignKey(x => x.LabelId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<CardMember>().HasOne<Card>().WithMany().HasForeignKey(x => x.CardId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<CardMember>().HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Checklist>().HasOne<Card>().WithMany().HasForeignKey(x => x.CardId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ChecklistItem>().HasOne<Checklist>().WithMany().HasForeignKey(x => x.ChecklistId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ChecklistItem>().HasOne<User>().WithMany().HasForeignKey(x => x.AssignedUserId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<CardComment>().HasOne<Card>().WithMany().HasForeignKey(x => x.CardId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<CardComment>().HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<StoredFile>().HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CardAttachment>().HasOne<Card>().WithMany().HasForeignKey(x => x.CardId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<CardAttachment>().HasOne<StoredFile>().WithMany().HasForeignKey(x => x.FileId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CardAttachment>().HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CardActivity>().HasOne<Card>().WithMany().HasForeignKey(x => x.CardId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<CardActivity>().HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CardLink>().HasOne<Card>().WithMany().HasForeignKey(x => x.CardId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<CardLink>().HasOne<Card>().WithMany().HasForeignKey(x => x.LinkedCardId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CardBug>().HasOne<Card>().WithMany().HasForeignKey(x => x.CardId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<CardBug>().HasOne<User>().WithMany().HasForeignKey(x => x.ReporterId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<CardBug>().HasOne<User>().WithMany().HasForeignKey(x => x.AssigneeId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<BugHistory>().HasOne<CardBug>().WithMany().HasForeignKey(x => x.BugId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<BugHistory>().HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<BugAttachment>().HasOne<CardBug>().WithMany().HasForeignKey(x => x.BugId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<BugAttachment>().HasOne<StoredFile>().WithMany().HasForeignKey(x => x.FileId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<InventoryItem>().HasOne<User>().WithMany().HasForeignKey(x => x.CreatedById).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<InventoryItem>().HasOne<User>().WithMany().HasForeignKey(x => x.UpdatedById).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<InventoryItem>().HasOne<User>().WithMany().HasForeignKey(x => x.AssignedToUserId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<InventoryActivity>().HasOne<InventoryItem>().WithMany().HasForeignKey(x => x.InventoryItemId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<InventoryActivity>().HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Issue>().HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Issue>().HasOne<User>().WithMany().HasForeignKey(x => x.CreatorId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TimeEntry>().HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TimeEntry>().HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<TimeEntry>().HasOne<WorkTask>().WithMany().HasForeignKey(x => x.TaskId).OnDelete(DeleteBehavior.SetNull);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<Entity>().Where(x => x.State == EntityState.Modified))
            entry.Entity.UpdatedAt = DateTime.UtcNow;
        return base.SaveChangesAsync(cancellationToken);
    }
}
