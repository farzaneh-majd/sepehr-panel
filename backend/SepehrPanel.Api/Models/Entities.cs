using System.ComponentModel.DataAnnotations;

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
}

public sealed class Card : Entity
{
    [MaxLength(300)] public string Title { get; set; } = "";
    [MaxLength(10000)] public string? Description { get; set; }
    public int ListId { get; set; }
    public int Position { get; set; }
    [MaxLength(30)] public string? CoverColor { get; set; }
    public DateTime? DueDate { get; set; }
    public bool DueComplete { get; set; }
    public bool IsArchived { get; set; }
    public int? TaskId { get; set; }
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
