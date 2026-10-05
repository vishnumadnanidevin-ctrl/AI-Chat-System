using AIChat.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AIChat.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<RevokedToken> RevokedTokens => Set<RevokedToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.GoogleSubjectId).IsUnique();
            entity.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<RevokedToken>(entity =>
        {
            entity.HasIndex(t => t.UserId);
            entity.HasIndex(t => t.ExpiresAt);
        });
    }
}
