using CK.Core;
using CK.SqlServer;
using Dapper;

namespace CK.Ng.Admin.UserManagement.Tests.WorkspaceUsers;

/// <summary>
/// Combined workspace-user listing (core + BinDate + e-mail). Mirrors
/// <c>CK.Ng.Admin.Sample.App.WorkspaceUsers.WorkspaceUsersQueries</c>.
/// </summary>
public class WorkspaceUsersQueries : IAutoService
{
    readonly CK.DB.Actor.UserTable _userTable;

    public WorkspaceUsersQueries( CK.DB.Actor.UserTable userTable )
    {
        _userTable = userTable;
    }

    public async Task<IReadOnlyList<CK.IO.UserManagement.IWorkspaceUser>> GetWorkspaceUsersAsync( ISqlCallContext ctx, int workspaceId )
    {
        var users = await ctx[_userTable].QueryAsync<ICombinedWorkspaceUser>(
            """
            select distinct
                   u.UserId
                  ,u.UserName
                  ,Email = isnull( e.EMail, '' )
                  ,u.FirstName
                  ,u.LastName
                  ,IsWorkspaceAdmin = cast( case when CK.fAclGrantLevel( u.UserId, w.AclId ) >= 112 then 1 else 0 end as bit )
                  ,u.ExtendedCultureId
                  ,u.BinDate
              from CK.vUser u
                  inner join CK.tActorProfile ap on ap.ActorId = u.UserId
                  inner join CK.tWorkspace w on w.WorkspaceId = @WorkspaceId
                  left outer join CK.tActorEMail e on e.ActorId = u.UserId and e.IsPrimary = 1
              where ap.GroupId = @WorkspaceId and u.UserId > 1;
            """,
            new { WorkspaceId = workspaceId } );

        return users.Cast<CK.IO.UserManagement.IWorkspaceUser>().ToList();
    }
}
