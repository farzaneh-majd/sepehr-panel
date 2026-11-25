using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SepehrPanel.Api.Models;

public abstract class Entity
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class User : Entity
{
    [MaxLength(80)] public string Username { get; set; } = "";
    [MaxLength(190)] public string Email { get; set; } = "";
    [MaxLength(100)] public string? FirstName { get; set; }
    [MaxLength(100)] public string? LastName { get; set; }
    [MaxLength(500)] public string PasswordHash { get; set; } = "";
    [MaxLength(30)] public string Role { get; set; } = "user";
    public bool IsActive { get; set; } = true;
}

public sealed class RefreshToken : Entity
{
    public int UserId { get; set; }
    [MaxLength(128)] public string TokenHash { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
}

public sealed class Project : Entity
{
    [MaxLength(160)] public string Name { get; set; } = "";
    [MaxLength(4000)] public string? Description { get; set; }
    [MaxLength(30)] public string Color { get; set; } = "#3b82f6";
    public int OwnerId { get; set; }
    public bool IsPublic { get; set; } = true;
    public bool IsBillable { get; set; } = true;
    public bool IsArchived { get; set; }
}

public sealed class ProjectMember : Entity
{
    public int ProjectId { get; set; }
    public int UserId { get; set; }
    [MaxLength(30)] public string Role { get; set; } = "member";
}

public sealed class WorkTask : Entity
{
    [MaxLength(240)] public string Name { get; set; } = "";
    [MaxLength(4000)] public string? Description { get; set; }
    public int ProjectId { get; set; }
    public int CreatorId { get; set; }
    [MaxLength(30)] public string Status { get; set; } = "active";
    public bool IsCompleted { get; set; }
}

public sealed class Board : Entity
{
    [MaxLength(160)] public string Name { get; set; } = "";
    [MaxLength(4000)] public string? Description { get; set; }
    [MaxLength(100)] public string Background { get; set; } = "#0052cc";
    [MaxLength(30)] public string Visibility { get; set; } = "private";
    public int OwnerId { get; set; }
    public int? ProjectId { get; set; }
    public bool IsStarred { get; set; }
    public bool IsClosed { get; set; }
    public bool AutoNumberCards { get; set; }
    public int? CreatedById { get; set; }
    public int? UpdatedById { get; set; }
}

public sealed class BoardMember : Entity
{
    public int BoardId { get; set; }
    public int UserId { get; set; }
    [MaxLength(30)] public string Role { get; set; } = "member";
}

public sealed class BoardList : Entity
{
    [MaxLength(160)] public string Name { get; set; } = "";
    public int BoardId { get; set; }
    public int Position { get; set; }
    public bool IsArchived { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public int? CreatedById { get; set; }
    public int? UpdatedById { get; set; }
}

public sealed class Card : Entity
{
    [MaxLength(300)] public string Title { get; set; } = "";
    [MaxLength(10000)] public string? Description { get; set; }
    public int ListId { get; set; }
    public int Position { get; set; }
    [MaxLength(30)] public string? CoverColor { get; set; }
    [MaxLength(1000)] public string? CoverImage { get; set; }
    public int? SequenceNumber { get; set; }
    public DateTime? DueDate { get; set; }
    public bool DueComplete { get; set; }
    public bool IsArchived { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public int? TaskId { get; set; }
    public int? CreatedById { get; set; }
    public int? UpdatedById { get; set; }
}

public sealed class InventoryItem : Entity
{
    [MaxLength(80)] public string Sku { get; set; } = "";
    [MaxLength(80)] public string? AssetTag { get; set; }
    [MaxLength(240)] public string Name { get; set; } = "";
    [MaxLength(4000)] public string? Description { get; set; }
    [MaxLength(120)] public string Category { get; set; } = "Other";
    [MaxLength(120)] public string? Manufacturer { get; set; }
    [MaxLength(160)] public string? Model { get; set; }
    [MaxLength(160)] public string? SerialNumber { get; set; }
    [MaxLength(40)] public string Status { get; set; } = "Available";
    [MaxLength(40)] public string Condition { get; set; } = "Good";
    public decimal Quantity { get; set; }
    public decimal MinimumQuantity { get; set; }
    [MaxLength(40)] public string Unit { get; set; } = "pcs";
    [MaxLength(160)] public string? Location { get; set; }
    [MaxLength(160)] public string? Department { get; set; }
    public int? AssignedToUserId { get; set; }
    [MaxLength(200)] public string? Supplier { get; set; }
    public DateTime? PurchaseDate { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal? PurchasePrice { get; set; }
    public DateTime? WarrantyExpiry { get; set; }
    [MaxLength(1000)] public string? ImageUrl { get; set; }
    [MaxLength(4000)] public string? Notes { get; set; }
    public int CreatedById { get; set; }
    public int UpdatedById { get; set; }
}

public sealed class InventoryActivity : Entity
{
    public int InventoryItemId { get; set; }
    public int UserId { get; set; }
    [MaxLength(80)] public string Action { get; set; } = "Updated";
    [MaxLength(2000)] public string? Details { get; set; }
}

public sealed class BoardLabel : Entity
{
    public int BoardId { get; set; }
    [MaxLength(100)] public string Name { get; set; } = "";
    [MaxLength(30)] public string Color { get; set; } = "#579dff";
}

public sealed class CardLabel : Entity
{
    public int CardId { get; set; }
    public int LabelId { get; set; }
}

public sealed class CardMember : Entity
{
    public int CardId { get; set; }
    public int UserId { get; set; }
}

public sealed class Checklist : Entity
{
    public int CardId { get; set; }
    [MaxLength(200)] public string Name { get; set; } = "Checklist";
    public int Position { get; set; }
}

public sealed class ChecklistItem : Entity
{
    public int ChecklistId { get; set; }
    [MaxLength(500)] public string Name { get; set; } = "";
    public bool IsChecked { get; set; }
    public int Position { get; set; }
    public DateTime? DueDate { get; set; }
    public int? AssignedUserId { get; set; }
}

public sealed class CardComment : Entity
{
    public int CardId { get; set; }
    public int UserId { get; set; }
    [MaxLength(10000)] public string Content { get; set; } = "";
}

public sealed class StoredFile : Entity
{
    public int UserId { get; set; }
    [MaxLength(260)] public string Name { get; set; } = "";
    [MaxLength(150)] public string ContentType { get; set; } = "application/octet-stream";
    public long Size { get; set; }
    public byte[] Data { get; set; } = [];
}

public sealed class CardAttachment : Entity
{
    public int CardId { get; set; }
    public int FileId { get; set; }
    public int UserId { get; set; }
    [MaxLength(260)] public string Name { get; set; } = "";
}

public sealed class CardActivity : Entity
{
    public int CardId { get; set; }
    public int UserId { get; set; }
    [MaxLength(500)] public string Action { get; set; } = "";
    [MaxLength(4000)] public string? Data { get; set; }
}

public sealed class CardLink : Entity
{
    public int CardId { get; set; }
    public int LinkedCardId { get; set; }
}

public sealed class CardBug : Entity
{
    public int CardId { get; set; }
    [MaxLength(300)] public string Title { get; set; } = "";
    [Column(TypeName = "longtext")] public string StepsToReproduce { get; set; } = "";
    [Column(TypeName = "longtext")] public string ExpectedResult { get; set; } = "";
    [Column(TypeName = "longtext")] public string ActualResult { get; set; } = "";
    [Column(TypeName = "longtext")] public string? Description { get; set; }
    [MaxLength(30)] public string Severity { get; set; } = "Medium";
    [MaxLength(30)] public string? Priority { get; set; }
    [MaxLength(500)] public string? Environment { get; set; }
    [MaxLength(30)] public string? Team { get; set; }
    public int? ReporterId { get; set; }
    [MaxLength(200)] public string? ReporterName { get; set; }
    public int? AssigneeId { get; set; }
    [MaxLength(30)] public string? AssigneeTeam { get; set; }
    [MaxLength(30)] public string Status { get; set; } = "Open";
    [MaxLength(40)] public string? Resolution { get; set; }
}

public sealed class BugHistory : Entity
{
    public int BugId { get; set; }
    public int? UserId { get; set; }
    [MaxLength(1000)] public string Message { get; set; } = "";
}

public sealed class BugAttachment : Entity
{
    public int BugId { get; set; }
    public int FileId { get; set; }
    [MaxLength(260)] public string Name { get; set; } = "";
    [MaxLength(30)] public string? Status { get; set; }
}

public sealed class Issue : Entity
{
    [MaxLength(30)] public string Key { get; set; } = "";
    [MaxLength(300)] public string Title { get; set; } = "";
    [MaxLength(30)] public string Status { get; set; } = "TO DO";
    [MaxLength(50)] public string Label { get; set; } = "SETUP";
    [MaxLength(20)] public string Priority { get; set; } = "Medium";
    [MaxLength(10)] public string Assignee { get; set; } = "FP";
    public int? ProjectId { get; set; }
    public int CreatorId { get; set; }
}

public sealed class TimeEntry : Entity
{
    [MaxLength(1000)] public string? Description { get; set; }
    public int UserId { get; set; }
    public int? ProjectId { get; set; }
    public int? TaskId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int? Duration { get; set; }
    public bool IsBillable { get; set; }
}
