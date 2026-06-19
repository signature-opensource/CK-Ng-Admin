using System.Globalization;
using System.Text.Json;
using CK.Core;
using CK.DB.Actor;
using CK.IO.UserManagement;
using CK.IO.UserProfile.Workspace;
using CK.SqlServer;
using Dapper;

namespace CK.UserManagement;

/// <summary>
/// Dapper read queries for the user-management handlers, written against the standard CK.DB
/// schema (<c>CK.vUser</c>, <c>CK.tActorProfile</c>, <c>CK.vGroup</c>, <c>CK.vZone</c>,
/// <c>CK.tWorkspace</c>, <c>CK.tTokenStore</c>). Results are projected to flat records and
/// rebuilt as Pocos through the <see cref="PocoDirectory"/>.
/// </summary>
public class UserManagementQueries : IAutoService
{
    readonly PocoDirectory _pocoDir;
    readonly UserTable _userTable;

    public UserManagementQueries( PocoDirectory pocoDirectory, UserTable userTable )
    {
        _pocoDir = pocoDirectory;
        _userTable = userTable;
    }

    /// <summary>The TokenStore scope under which a workspace invitation is stored.</summary>
    public static string InvitationScope( int workspaceId ) => $"WorkspaceInvitation.{workspaceId}";

    /// <summary>Matches every workspace invitation scope (platform-wide listing).</summary>
    public const string InvitationScopeLikePattern = "WorkspaceInvitation.%";

    public async Task<IReadOnlyList<IWorkspaceUser>> GetWorkspaceUsersAsync( ISqlCallContext ctx, int workspaceId )
    {
        var rows = await ctx[_userTable].QueryAsync<FlatWorkspaceUser>(
            """
            select distinct
                   u.UserId
                  ,u.UserName
                  ,u.FirstName
                  ,u.LastName
                  ,IsWorkspaceAdmin = cast( case when CK.fAclGrantLevel( u.UserId, w.AclId ) >= 112 then 1 else 0 end as bit )
                  ,u.ExtendedCultureId
                  ,u.BinDate
              from CK.vUser u
                  inner join CK.tActorProfile ap on ap.ActorId = u.UserId
                  inner join CK.tWorkspace w on w.WorkspaceId = @WorkspaceId
              where ap.GroupId = @WorkspaceId and u.UserId > 1;
            """,
            new { WorkspaceId = workspaceId } );

        return rows.Select( r => _pocoDir.Create<IWorkspaceUser>( u =>
        {
            u.UserId = r.UserId;
            u.UserName = r.UserName;
            u.FirstName = r.FirstName;
            u.LastName = r.LastName;
            u.IsWorkspaceAdmin = r.IsWorkspaceAdmin;
            u.ExtendedCultureId = r.ExtendedCultureId;
            u.BinDate = r.BinDate;
        } ) ).ToList();
    }

    public async Task<IReadOnlyList<IGroupInfos>> GetWorkspaceGroupsAsync( ISqlCallContext ctx, int workspaceId )
    {
        var rows = await ctx[_userTable].QueryAsync<FlatGroup>(
            """
            select g.GroupId
                  ,g.GroupName
                  ,g.IsZone
                  ,g.ZoneId
                  ,ZoneName = isnull( z.ZoneName, '' )
              from CK.vGroup g
                  left outer join CK.vZone z on z.ZoneId = g.ZoneId
              where g.ZoneId = @WorkspaceId and g.GroupId > 1 and g.GroupName not like '%Operators';
            """,
            new { WorkspaceId = workspaceId } );

        return rows.Select( MapGroup ).ToList();
    }

    public async Task<IReadOnlyList<IGroupInfos>> GetUserWorkspaceGroupsAsync( ISqlCallContext ctx, int workspaceId, int userId )
    {
        var rows = await ctx[_userTable].QueryAsync<FlatGroup>(
            """
            select g.GroupId
                  ,g.GroupName
                  ,g.IsZone
                  ,g.ZoneId
                  ,ZoneName = isnull( z.ZoneName, '' )
              from CK.vGroup g
                  inner join CK.tActorProfile ap on ap.GroupId = g.GroupId
                  left outer join CK.vZone z on z.ZoneId = g.ZoneId
              where ap.ActorId = @UserId and g.ZoneId = @WorkspaceId;
            """,
            new { WorkspaceId = workspaceId, UserId = userId } );

        return rows.Select( MapGroup ).ToList();
    }

    /// <summary>
    /// Ids of the groups (within the workspace zone) the user currently belongs to.
    /// Used to compute the add/remove delta when editing a workspace user.
    /// </summary>
    public async Task<IReadOnlyList<int>> GetUserWorkspaceGroupIdsAsync( ISqlCallContext ctx, int workspaceId, int userId )
    {
        var ids = await ctx[_userTable].QueryAsync<int>(
            """
            select ap.GroupId
              from CK.tActorProfile ap
                  inner join CK.vGroup g on g.GroupId = ap.GroupId
              where ap.ActorId = @UserId and g.ZoneId = @WorkspaceId and ap.GroupId <> ap.ActorId;
            """,
            new { WorkspaceId = workspaceId, UserId = userId } );
        return ids.ToList();
    }

    /// <summary>
    /// Pending invitations stored in the TokenStore. When <paramref name="useLikePattern"/> is true,
    /// <paramref name="scope"/> is matched with a <c>like</c> (platform-wide listing).
    /// </summary>
    public async Task<IReadOnlyList<IPendingInvitation>> GetPendingInvitationsAsync( ISqlCallContext ctx, string scope, bool useLikePattern = false )
    {
        var op = useLikePattern ? "like" : "=";
        var rows = await ctx[_userTable].QueryAsync<FlatInvitation>(
            $"""
            select TokenKey
                  ,Active
                  ,ExpirationDateUtc
                  ,ExtraData
              from CK.tTokenStore
              where TokenScope {op} @Scope and ExpirationDateUtc > sysutcdatetime();
            """,
            new { Scope = scope } );

        return rows.Select( r =>
        {
            var payload = InvitationPayload.Deserialize( r.ExtraData );
            return _pocoDir.Create<IPendingInvitation>( i =>
            {
                i.Email = r.TokenKey;
                i.Active = r.Active;
                i.CultureName = payload.CultureName;
                i.NativeName = ToNativeName( payload.CultureName );
                i.ExpirationDateUtc = r.ExpirationDateUtc;
            } );
        } ).ToList();
    }

    /// <summary>Resolves the TokenStore identifier of a pending invitation from its scope and email.</summary>
    public async Task<(int TokenId, string Token)?> GetInvitationRefAsync( ISqlCallContext ctx, string scope, string email )
    {
        var row = await ctx[_userTable].QuerySingleOrDefaultAsync<FlatTokenRef>(
            """
            select TokenId, Token
              from CK.tTokenStore
              where TokenScope = @Scope and TokenKey = @Email;
            """,
            new { Scope = scope, Email = email } );
        return row is null ? null : (row.TokenId, row.Token);
    }

    IGroupInfos MapGroup( FlatGroup g ) => _pocoDir.Create<IGroupInfos>( gi =>
    {
        gi.GroupId = g.GroupId;
        gi.GroupName = g.GroupName;
        gi.IsZone = g.IsZone;
        gi.ZoneId = g.ZoneId;
        gi.ZoneName = g.ZoneName;
    } );

    static string ToNativeName( string cultureName )
    {
        try { return new CultureInfo( cultureName ).NativeName; }
        catch( CultureNotFoundException ) { return cultureName; }
    }

    record FlatWorkspaceUser
    {
        public int UserId { get; init; }
        public string UserName { get; init; } = string.Empty;
        public string FirstName { get; init; } = string.Empty;
        public string LastName { get; init; } = string.Empty;
        public bool IsWorkspaceAdmin { get; init; }
        public int ExtendedCultureId { get; init; }
        public DateTime? BinDate { get; set; } = null;
    }

    record FlatGroup
    {
        public int GroupId { get; init; }
        public string GroupName { get; init; } = string.Empty;
        public bool IsZone { get; init; }
        public int ZoneId { get; init; }
        public string ZoneName { get; init; } = string.Empty;
    }

    record FlatInvitation
    {
        public string TokenKey { get; init; } = string.Empty;
        public bool Active { get; init; }
        public DateTime ExpirationDateUtc { get; init; }
        public byte[]? ExtraData { get; init; }
    }

    record FlatTokenRef
    {
        public int TokenId { get; init; }
        public string Token { get; init; } = string.Empty;
    }
}

/// <summary>
/// Data carried by a workspace invitation, persisted as UTF-8 JSON in the TokenStore
/// <c>ExtraData</c> column (the culture and the groups the invited user will join).
/// </summary>
public sealed record InvitationPayload( string CultureName, List<int> Groups )
{
    public byte[] Serialize() => JsonSerializer.SerializeToUtf8Bytes( this );

    public static InvitationPayload Deserialize( byte[]? extraData )
    {
        if( extraData is null || extraData.Length == 0 ) return new InvitationPayload( "fr", new List<int>() );
        return JsonSerializer.Deserialize<InvitationPayload>( extraData ) ?? new InvitationPayload( "fr", new List<int>() );
    }
}
