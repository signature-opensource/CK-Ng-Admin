using CK.Core;
using CK.DB.Actor;
using CK.DB.UserInvitation;
using CK.IO.UserInvitation;
using CK.IO.UserManagement;
using CK.IO.UserProfile.Workspace;
using CK.SqlServer;
using Dapper;

namespace CK.UserManagement;

/// <summary>
/// Dapper read queries for the user-management handlers, written against the standard CK.DB
/// schema (<c>CK.vUser</c>, <c>CK.tActorProfile</c>, <c>CK.vGroup</c>, <c>CK.vZone</c>,
/// <c>CK.tWorkspace</c>, <c>CK.tCulture</c>). Pending invitations come from
/// <c>CK.DB.UserInvitation</c>; the workspace an invitation belongs to is derived from the zone of
/// its groups. Results are projected to flat records and rebuilt as Pocos through the
/// <see cref="PocoDirectory"/>.
/// </summary>
public class UserManagementQueries : IAutoService
{
    // Invitations are created on behalf of the system user (see UserManagementService).
    const int SystemActorId = 1;

    readonly PocoDirectory _pocoDir;
    readonly UserTable _userTable;
    readonly CK.DB.UserInvitation.Package _invitationPackage;

    public UserManagementQueries( PocoDirectory pocoDirectory, UserTable userTable, CK.DB.UserInvitation.Package invitationPackage )
    {
        _pocoDir = pocoDirectory;
        _userTable = userTable;
        _invitationPackage = invitationPackage;
    }

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
    /// Pending (non-expired) invitations from <c>CK.DB.UserInvitation</c>. When
    /// <paramref name="workspaceId"/> is provided, only invitations whose groups belong to that
    /// workspace zone are returned; otherwise every pending invitation is returned (platform-wide).
    /// </summary>
    public async Task<IReadOnlyList<IPendingInvitation>> GetPendingInvitationsAsync( ISqlCallContext ctx, int? workspaceId = null )
    {
        var all = await _invitationPackage.GetUserInvitationsAsync( ctx, _pocoDir.Create<IGetUserInvitationsQCommand>( c => c.ActorId = SystemActorId ) );
        var pending = all.Where( i => i.ExpirationDateUtc > DateTime.UtcNow ).ToList();

        if( workspaceId is > 0 )
        {
            var groupIds = pending.SelectMany( i => i.GroupIdentifiers ).Distinct().ToList();
            var groupWorkspaces = await GetGroupWorkspacesAsync( ctx, groupIds );
            pending = pending.Where( i => i.GroupIdentifiers.Any( g => groupWorkspaces.TryGetValue( g, out var w ) && w == workspaceId.Value ) ).ToList();
        }

        var cultures = await GetCultureNamesAsync( ctx, pending.Select( i => i.CultureId ).Distinct().ToList() );

        return pending.Select( i =>
        {
            cultures.TryGetValue( i.CultureId, out var culture );
            return _pocoDir.Create<IPendingInvitation>( p =>
            {
                p.Email = i.UserTargetAddress;
                p.Active = i.IsActive;
                p.CultureName = culture?.Name ?? "fr";
                p.NativeName = culture?.NativeName ?? "Français";
                p.ExpirationDateUtc = i.ExpirationDateUtc;
            } );
        } ).ToList();
    }

    /// <summary>
    /// Derives the workspace an invitation targets from its groups.
    /// Returns the first resolved workspace, or 0 when none can be resolved.
    /// </summary>
    public async Task<int> GetWorkspaceIdForGroupsAsync( ISqlCallContext ctx, IEnumerable<int> groupIds )
    {
        var workspaces = await GetGroupWorkspacesAsync( ctx, groupIds );
        return workspaces.Values.FirstOrDefault( w => w > 0 );
    }

    /// <summary>
    /// Maps the given group ids to the workspace (zone) they belong to. A workspace is a zone, so a
    /// zone group carries the workspace on its own <c>GroupId</c> (its <c>ZoneId</c> is 0), while a
    /// regular group carries it on its <c>ZoneId</c>.
    /// </summary>
    async Task<Dictionary<int, int>> GetGroupWorkspacesAsync( ISqlCallContext ctx, IEnumerable<int> groupIds )
    {
        var ids = groupIds.ToList();
        if( ids.Count == 0 ) return new();
        var rows = await ctx[_userTable].QueryAsync<FlatGroupWorkspace>(
            "select GroupId, WorkspaceId = case when IsZone = 1 then GroupId else ZoneId end from CK.vGroup where GroupId in @Ids;",
            new { Ids = ids } );
        return rows.ToDictionary( r => r.GroupId, r => r.WorkspaceId );
    }

    /// <summary>Resolves the culture name and native name for the given culture ids.</summary>
    async Task<Dictionary<int, FlatCulture>> GetCultureNamesAsync( ISqlCallContext ctx, IEnumerable<int> cultureIds )
    {
        var ids = cultureIds.ToList();
        if( ids.Count == 0 ) return new();
        var rows = await ctx[_userTable].QueryAsync<FlatCulture>(
            "select CultureId, Name, NativeName from CK.tCulture where CultureId in @Ids;",
            new { Ids = ids } );
        return rows.ToDictionary( r => r.CultureId, r => r );
    }

    IGroupInfos MapGroup( FlatGroup g ) => _pocoDir.Create<IGroupInfos>( gi =>
    {
        gi.GroupId = g.GroupId;
        gi.GroupName = g.GroupName;
        gi.IsZone = g.IsZone;
        gi.ZoneId = g.ZoneId;
        gi.ZoneName = g.ZoneName;
    } );

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

    record FlatGroupWorkspace
    {
        public int GroupId { get; init; }
        public int WorkspaceId { get; init; }
    }

    record FlatCulture
    {
        public int CultureId { get; init; }
        public string Name { get; init; } = string.Empty;
        public string NativeName { get; init; } = string.Empty;
    }
}
