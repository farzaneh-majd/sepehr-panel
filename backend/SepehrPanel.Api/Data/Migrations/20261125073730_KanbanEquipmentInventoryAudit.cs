using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SepehrPanel.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class KanbanEquipmentInventoryAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CoverImage",
                table: "Cards",
                type: "varchar(1000)",
                maxLength: 1000,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "CreatedById",
                table: "Cards",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Cards",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Cards",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "SequenceNumber",
                table: "Cards",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UpdatedById",
                table: "Cards",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "AutoNumberCards",
                table: "Boards",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "CreatedById",
                table: "Boards",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UpdatedById",
                table: "Boards",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CreatedById",
                table: "BoardLists",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "BoardLists",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "BoardLists",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "UpdatedById",
                table: "BoardLists",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BoardLabels",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    BoardId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Color = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BoardLabels", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BoardLabels_Boards_BoardId",
                        column: x => x.BoardId,
                        principalTable: "Boards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "CardActivities",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CardId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Action = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Data = table.Column<string>(type: "varchar(4000)", maxLength: 4000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CardActivities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CardActivities_Cards_CardId",
                        column: x => x.CardId,
                        principalTable: "Cards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CardActivities_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "CardBugs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CardId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "varchar(300)", maxLength: 300, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StepsToReproduce = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ExpectedResult = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ActualResult = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Severity = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Priority = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Environment = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Team = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ReporterId = table.Column<int>(type: "int", nullable: true),
                    ReporterName = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AssigneeId = table.Column<int>(type: "int", nullable: true),
                    AssigneeTeam = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Resolution = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CardBugs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CardBugs_Cards_CardId",
                        column: x => x.CardId,
                        principalTable: "Cards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CardBugs_Users_AssigneeId",
                        column: x => x.AssigneeId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_CardBugs_Users_ReporterId",
                        column: x => x.ReporterId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "CardComments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CardId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Content = table.Column<string>(type: "varchar(10000)", maxLength: 10000, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CardComments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CardComments_Cards_CardId",
                        column: x => x.CardId,
                        principalTable: "Cards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CardComments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "CardLinks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CardId = table.Column<int>(type: "int", nullable: false),
                    LinkedCardId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CardLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CardLinks_Cards_CardId",
                        column: x => x.CardId,
                        principalTable: "Cards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CardLinks_Cards_LinkedCardId",
                        column: x => x.LinkedCardId,
                        principalTable: "Cards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "CardMembers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CardId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CardMembers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CardMembers_Cards_CardId",
                        column: x => x.CardId,
                        principalTable: "Cards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CardMembers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Checklists",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CardId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Position = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Checklists", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Checklists_Cards_CardId",
                        column: x => x.CardId,
                        principalTable: "Cards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "InventoryItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Sku = table.Column<string>(type: "varchar(80)", maxLength: 80, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AssetTag = table.Column<string>(type: "varchar(80)", maxLength: 80, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Name = table.Column<string>(type: "varchar(240)", maxLength: 240, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "varchar(4000)", maxLength: 4000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Category = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Manufacturer = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Model = table.Column<string>(type: "varchar(160)", maxLength: 160, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SerialNumber = table.Column<string>(type: "varchar(160)", maxLength: 160, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Condition = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Quantity = table.Column<decimal>(type: "decimal(65,30)", nullable: false),
                    MinimumQuantity = table.Column<decimal>(type: "decimal(65,30)", nullable: false),
                    Unit = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Location = table.Column<string>(type: "varchar(160)", maxLength: 160, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Department = table.Column<string>(type: "varchar(160)", maxLength: 160, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AssignedToUserId = table.Column<int>(type: "int", nullable: true),
                    Supplier = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PurchaseDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    PurchasePrice = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    WarrantyExpiry = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    ImageUrl = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Notes = table.Column<string>(type: "varchar(4000)", maxLength: 4000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedById = table.Column<int>(type: "int", nullable: false),
                    UpdatedById = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryItems_Users_AssignedToUserId",
                        column: x => x.AssignedToUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_InventoryItems_Users_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryItems_Users_UpdatedById",
                        column: x => x.UpdatedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "StoredFiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "varchar(260)", maxLength: 260, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ContentType = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Size = table.Column<long>(type: "bigint", nullable: false),
                    Data = table.Column<byte[]>(type: "longblob", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoredFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StoredFiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "CardLabels",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CardId = table.Column<int>(type: "int", nullable: false),
                    LabelId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CardLabels", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CardLabels_BoardLabels_LabelId",
                        column: x => x.LabelId,
                        principalTable: "BoardLabels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CardLabels_Cards_CardId",
                        column: x => x.CardId,
                        principalTable: "Cards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "BugHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    BugId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: true),
                    Message = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BugHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BugHistories_CardBugs_BugId",
                        column: x => x.BugId,
                        principalTable: "CardBugs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BugHistories_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ChecklistItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ChecklistId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsChecked = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Position = table.Column<int>(type: "int", nullable: false),
                    DueDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    AssignedUserId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChecklistItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChecklistItems_Checklists_ChecklistId",
                        column: x => x.ChecklistId,
                        principalTable: "Checklists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ChecklistItems_Users_AssignedUserId",
                        column: x => x.AssignedUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "InventoryActivities",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    InventoryItemId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Action = table.Column<string>(type: "varchar(80)", maxLength: 80, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Details = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryActivities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryActivities_InventoryItems_InventoryItemId",
                        column: x => x.InventoryItemId,
                        principalTable: "InventoryItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InventoryActivities_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "BugAttachments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    BugId = table.Column<int>(type: "int", nullable: false),
                    FileId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "varchar(260)", maxLength: 260, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BugAttachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BugAttachments_CardBugs_BugId",
                        column: x => x.BugId,
                        principalTable: "CardBugs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BugAttachments_StoredFiles_FileId",
                        column: x => x.FileId,
                        principalTable: "StoredFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "CardAttachments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CardId = table.Column<int>(type: "int", nullable: false),
                    FileId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "varchar(260)", maxLength: 260, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CardAttachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CardAttachments_Cards_CardId",
                        column: x => x.CardId,
                        principalTable: "Cards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CardAttachments_StoredFiles_FileId",
                        column: x => x.FileId,
                        principalTable: "StoredFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CardAttachments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Cards_CreatedById",
                table: "Cards",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Cards_UpdatedById",
                table: "Cards",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Boards_CreatedById",
                table: "Boards",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Boards_UpdatedById",
                table: "Boards",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_BoardLists_CreatedById",
                table: "BoardLists",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_BoardLists_UpdatedById",
                table: "BoardLists",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_BoardLabels_BoardId_Name",
                table: "BoardLabels",
                columns: new[] { "BoardId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BugAttachments_BugId",
                table: "BugAttachments",
                column: "BugId");

            migrationBuilder.CreateIndex(
                name: "IX_BugAttachments_FileId",
                table: "BugAttachments",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_BugHistories_BugId",
                table: "BugHistories",
                column: "BugId");

            migrationBuilder.CreateIndex(
                name: "IX_BugHistories_UserId",
                table: "BugHistories",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_CardActivities_CardId",
                table: "CardActivities",
                column: "CardId");

            migrationBuilder.CreateIndex(
                name: "IX_CardActivities_UserId",
                table: "CardActivities",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_CardAttachments_CardId",
                table: "CardAttachments",
                column: "CardId");

            migrationBuilder.CreateIndex(
                name: "IX_CardAttachments_FileId",
                table: "CardAttachments",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_CardAttachments_UserId",
                table: "CardAttachments",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_CardBugs_AssigneeId",
                table: "CardBugs",
                column: "AssigneeId");

            migrationBuilder.CreateIndex(
                name: "IX_CardBugs_CardId",
                table: "CardBugs",
                column: "CardId");

            migrationBuilder.CreateIndex(
                name: "IX_CardBugs_ReporterId",
                table: "CardBugs",
                column: "ReporterId");

            migrationBuilder.CreateIndex(
                name: "IX_CardComments_CardId",
                table: "CardComments",
                column: "CardId");

            migrationBuilder.CreateIndex(
                name: "IX_CardComments_UserId",
                table: "CardComments",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_CardLabels_CardId_LabelId",
                table: "CardLabels",
                columns: new[] { "CardId", "LabelId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CardLabels_LabelId",
                table: "CardLabels",
                column: "LabelId");

            migrationBuilder.CreateIndex(
                name: "IX_CardLinks_CardId_LinkedCardId",
                table: "CardLinks",
                columns: new[] { "CardId", "LinkedCardId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CardLinks_LinkedCardId",
                table: "CardLinks",
                column: "LinkedCardId");

            migrationBuilder.CreateIndex(
                name: "IX_CardMembers_CardId_UserId",
                table: "CardMembers",
                columns: new[] { "CardId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CardMembers_UserId",
                table: "CardMembers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ChecklistItems_AssignedUserId",
                table: "ChecklistItems",
                column: "AssignedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ChecklistItems_ChecklistId",
                table: "ChecklistItems",
                column: "ChecklistId");

            migrationBuilder.CreateIndex(
                name: "IX_Checklists_CardId",
                table: "Checklists",
                column: "CardId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryActivities_InventoryItemId",
                table: "InventoryActivities",
                column: "InventoryItemId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryActivities_UserId",
                table: "InventoryActivities",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_AssetTag",
                table: "InventoryItems",
                column: "AssetTag",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_AssignedToUserId",
                table: "InventoryItems",
                column: "AssignedToUserId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_CreatedById",
                table: "InventoryItems",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_Sku",
                table: "InventoryItems",
                column: "Sku",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_UpdatedById",
                table: "InventoryItems",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_StoredFiles_UserId",
                table: "StoredFiles",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_BoardLists_Users_CreatedById",
                table: "BoardLists",
                column: "CreatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_BoardLists_Users_UpdatedById",
                table: "BoardLists",
                column: "UpdatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Boards_Users_CreatedById",
                table: "Boards",
                column: "CreatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Boards_Users_UpdatedById",
                table: "Boards",
                column: "UpdatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Cards_Users_CreatedById",
                table: "Cards",
                column: "CreatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Cards_Users_UpdatedById",
                table: "Cards",
                column: "UpdatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BoardLists_Users_CreatedById",
                table: "BoardLists");

            migrationBuilder.DropForeignKey(
                name: "FK_BoardLists_Users_UpdatedById",
                table: "BoardLists");

            migrationBuilder.DropForeignKey(
                name: "FK_Boards_Users_CreatedById",
                table: "Boards");

            migrationBuilder.DropForeignKey(
                name: "FK_Boards_Users_UpdatedById",
                table: "Boards");

            migrationBuilder.DropForeignKey(
                name: "FK_Cards_Users_CreatedById",
                table: "Cards");

            migrationBuilder.DropForeignKey(
                name: "FK_Cards_Users_UpdatedById",
                table: "Cards");

            migrationBuilder.DropTable(
                name: "BugAttachments");

            migrationBuilder.DropTable(
                name: "BugHistories");

            migrationBuilder.DropTable(
                name: "CardActivities");

            migrationBuilder.DropTable(
                name: "CardAttachments");

            migrationBuilder.DropTable(
                name: "CardComments");

            migrationBuilder.DropTable(
                name: "CardLabels");

            migrationBuilder.DropTable(
                name: "CardLinks");

            migrationBuilder.DropTable(
                name: "CardMembers");

            migrationBuilder.DropTable(
                name: "ChecklistItems");

            migrationBuilder.DropTable(
                name: "InventoryActivities");

            migrationBuilder.DropTable(
                name: "CardBugs");

            migrationBuilder.DropTable(
                name: "StoredFiles");

            migrationBuilder.DropTable(
                name: "BoardLabels");

            migrationBuilder.DropTable(
                name: "Checklists");

            migrationBuilder.DropTable(
                name: "InventoryItems");

            migrationBuilder.DropIndex(
                name: "IX_Cards_CreatedById",
                table: "Cards");

            migrationBuilder.DropIndex(
                name: "IX_Cards_UpdatedById",
                table: "Cards");

            migrationBuilder.DropIndex(
                name: "IX_Boards_CreatedById",
                table: "Boards");

            migrationBuilder.DropIndex(
                name: "IX_Boards_UpdatedById",
                table: "Boards");

            migrationBuilder.DropIndex(
                name: "IX_BoardLists_CreatedById",
                table: "BoardLists");

            migrationBuilder.DropIndex(
                name: "IX_BoardLists_UpdatedById",
                table: "BoardLists");

            migrationBuilder.DropColumn(
                name: "CoverImage",
                table: "Cards");

            migrationBuilder.DropColumn(
                name: "CreatedById",
                table: "Cards");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Cards");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Cards");

            migrationBuilder.DropColumn(
                name: "SequenceNumber",
                table: "Cards");

            migrationBuilder.DropColumn(
                name: "UpdatedById",
                table: "Cards");

            migrationBuilder.DropColumn(
                name: "AutoNumberCards",
                table: "Boards");

            migrationBuilder.DropColumn(
                name: "CreatedById",
                table: "Boards");

            migrationBuilder.DropColumn(
                name: "UpdatedById",
                table: "Boards");

            migrationBuilder.DropColumn(
                name: "CreatedById",
                table: "BoardLists");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "BoardLists");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "BoardLists");

            migrationBuilder.DropColumn(
                name: "UpdatedById",
                table: "BoardLists");
        }
    }
}
