using CK.Core;
using CK.SqlServer;
using Dapper;

namespace CK.Ng.Admin.UserManagement.Tests.WorkspaceUsers;

/// <summary>
/// Combined workspace-user listing (core + bans + e-mail). Mirrors
/// <c>CK.Ng.Admin.Sample.App.WorkspaceUsers.WorkspaceUsersQueries</c>.
/// </summary>
public class WorkspaceUsersQueries : IAutoService
{
    readonly CK.DB.Actor.UserTable _userTable;
    readonly PocoDirectory _pocoDirectory;

    /// <summary>
    /// The left outer join on the banishments duplicates the user row once per banishment: the grouping
    /// is done in C# by <see cref="GetWorkspaceUsersAsync"/>. All the banishments are returned, expired
    /// ones included: the caller owns the definition of "currently banned".
    /// </summary>
    const string _getWorkspaceUsersSql =
        """
        select u.UserId
              ,u.UserName
              ,Email = isnull( e.EMail, '' )
              ,u.FirstName
              ,u.LastName
              ,IsWorkspaceAdmin = cast( case when CK.fAclGrantLevel( u.UserId, w.AclId ) >= 112 then 1 else 0 end as bit )
              ,u.ExtendedCultureId
              ,b.KeyReason
              ,b.BanStartDate
              ,b.BanEndDate
          from CK.vUser u
              inner join CK.tActorProfile ap on ap.ActorId = u.UserId
              inner join CK.tWorkspace w on w.WorkspaceId = @WorkspaceId
              left outer join CK.tActorEMail e on e.ActorId = u.UserId and e.IsPrimary = 1
              left outer join CK.tUserBanned b on b.UserId = u.UserId
          where ap.GroupId = @WorkspaceId and u.UserId > 1
          order by u.UserId, b.BanStartDate;
        """;

    /// <summary>
    /// The ban part of a joined row. Members are nullable: a user without any banishment yields a row
    /// whose ban columns are all null (left outer join). Dapper hands out a null BanRow in that case.
    /// </summary>
    sealed class BanRow
    {
        public string? KeyReason { get; set; }
        public DateTime? BanStartDate { get; set; }
        public DateTime? BanEndDate { get; set; }
    }

    public WorkspaceUsersQueries( CK.DB.Actor.UserTable userTable, PocoDirectory pocoDirectory )
    {
        _userTable = userTable;
        _pocoDirectory = pocoDirectory;
    }

    public async Task<IReadOnlyList<CK.IO.UserManagement.IWorkspaceUser>> GetWorkspaceUsersAsync( ISqlCallContext ctx, int workspaceId )
    {
        var byId = new Dictionary<int, ICombinedWorkspaceUser>();
        await ctx[_userTable].QueryAsync<ICombinedWorkspaceUser, BanRow, object?>(
            _getWorkspaceUsersSql,
            ( user, ban ) =>
            {
                if( !byId.TryGetValue( user.UserId, out var existing ) )
                {
                    byId.Add( user.UserId, existing = user );
                }
                if( ban?.KeyReason != null )
                {
                    existing.Bans.Add( _pocoDirectory.Create<CK.IO.UserManagement.UserBanned.IUserBan>( b =>
                    {
                        b.KeyReason = ban.KeyReason;
                        b.BanStartDate = ban.BanStartDate!.Value;
                        b.BanEndDate = ban.BanEndDate!.Value;
                    } ) );
                }
                return null;
            },
            new { WorkspaceId = workspaceId },
            splitOn: "KeyReason" );

        return byId.Values.Cast<CK.IO.UserManagement.IWorkspaceUser>().ToList();
    }
}
