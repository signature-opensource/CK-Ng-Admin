using CK.Core;
using CK.IO.UserProfile.Workspace;
using CK.SqlServer;
using Dapper;

namespace CK.Ng.Admin.Sample.App.User;

/// <summary>
/// Dapper queries that read a <see cref="IUserProfile"/> with its <see cref="IUserGroup"/> list.
/// The base <c>CK.sUserUserProfileRead</c> stored procedure only projects <c>UserId</c>/<c>UserName</c>, so this
/// service is used by <see cref="GetUserProfileCommandHandler"/> to override the default
/// <c>IGetUserProfileQCommand</c> handler with a result that includes groups + grant levels.
/// </summary>
public class UserQueries : IAutoService
{
    readonly DB.Actor.UserTable _userTable;
    readonly PocoDirectory _pocoDirectory;

    public UserQueries( DB.Actor.UserTable userTable, PocoDirectory pocoDirectory )
    {
        _userTable = userTable;
        _pocoDirectory = pocoDirectory;
    }

    public async Task<IUserProfile?> GetUserProfileAsync( ISqlCallContext ctx, int userId )
    {
        if( userId <= 0 ) return null;

        var rows = await ctx[_userTable].QueryAsync<FlatUserProfile>(
            """
            select distinct
                   u.UserId
                  ,u.UserName
                  ,u.PreferredWorkspaceId
                  ,GroupId    = isnull( g.GroupId, 0 )
                  ,GroupName  = isnull( g.GroupName, '' )
                  ,IsZone     = isnull( g.IsZone, cast( 0 as bit ) )
                  ,ZoneId     = isnull( g.ZoneId, 0 )
                  ,ZoneName   = isnull( z.ZoneName, '' )
                  ,GrantLevel = isnull( CK.fAclGrantLevel( @UserId, acl.AclId ), 0 )
            from CK.tUser u
                left join CK.tActorProfile ap
                    on ap.ActorId = u.UserId
                    and ap.ActorId <> ap.GroupId
                left join CK.vGroup g            on g.GroupId  = ap.GroupId
                left join CK.vZone z             on z.ZoneId   = g.ZoneId
                left join CK.vAclConfigMemory acl on acl.ActorId = g.GroupId
            where u.UserId = @UserId;
            """,
            new { UserId = userId } );

        return rows.GroupBy( r => r.UserId )
            .Select( u =>
            {
                var user = u.First();
                return _pocoDirectory.Create<IUserProfile>( up =>
                {
                    up.UserId = user.UserId;
                    up.UserName = user.UserName;
                    up.PreferredWorkspaceId = user.PreferredWorkspaceId;
                    foreach( var g in u.Where( r => r.GroupId != 0 ).DistinctBy( r => r.GroupId ) )
                    {
                        up.Groups.Add( _pocoDirectory.Create<IGroupInfos>( ug =>
                        {
                            //ug.GrantLevel = g.GrantLevel;
                            //ug.Group =
                            _pocoDirectory.Create<IGroupInfos>( gi =>
                            {
                                gi.GroupId = g.GroupId;
                                gi.GroupName = g.GroupName;
                                gi.IsZone = g.IsZone;
                                gi.ZoneId = g.ZoneId;
                                gi.ZoneName = g.ZoneName;
                            } );
                        } ) );
                    }
                } );
            } )
            .SingleOrDefault();
    }
}

record FlatUserProfile
{
    public int UserId { get; init; }
    public string UserName { get; init; } = string.Empty;
    public int PreferredWorkspaceId { get; init; }
    public int GroupId { get; init; }
    public string GroupName { get; init; } = string.Empty;
    public bool IsZone { get; init; }
    public int ZoneId { get; init; }
    public string ZoneName { get; init; } = string.Empty;
    public int GrantLevel { get; init; }
}
