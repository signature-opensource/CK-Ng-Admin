using CK.Core;
using CK.DB.Actor;
using CK.DB.User.UserPassword;
using CK.DB.Workspace;
using GroupTable = CK.DB.Zone.GroupTable;
using CK.IO.UserProfile.Workspace;
using CK.SqlServer;
using Dapper;

namespace CK.Ng.Admin.Sample.App;

/// <summary>
/// Seeds the demo data when the host starts, so that one can log in right away (Basic provider):
/// <list type="bullet">
///   <item>"AdminUser" / "success": member of the Administrators group (grant 127), isAdmin is true.</item>
///   <item>"TestUser" / "success": plain member of the AdminZone (grant 16), isAdmin is false.</item>
/// </list>
/// Group ids in CK's default schema: 2 = Administrators, 3 = AdminZone.
/// <para>
/// A second workspace ("Villars") with a "ContentManager" group AdminUser belongs to: the "Groups" column
/// of the user list shows a prefixed tag ("Villars: ContentManager") next to the unprefixed tags of the
/// current workspace.
/// </para>
/// </summary>
public sealed class DemoData : IRealObject
{
    Task OnHostStartAsync( IActivityMonitor monitor,
                           UserTable userTable,
                           UserPasswordTable pwdTable,
                           GroupTable groupTable,
                           CK.DB.Workspace.Package workspace,
                           WorkspaceTable workspaceTable,
                           CK.DB.Group.SimpleNaming.Package naming,
                           PocoDirectory pocoDirectory )
    {
        return SeedAsync( monitor, userTable, pwdTable, groupTable, workspace, workspaceTable, naming, pocoDirectory );
    }

    static async Task SeedAsync( IActivityMonitor monitor,
                                 UserTable userTable,
                                 UserPasswordTable pwdTable,
                                 GroupTable groupTable,
                                 CK.DB.Workspace.Package workspace,
                                 WorkspaceTable workspaceTable,
                                 CK.DB.Group.SimpleNaming.Package naming,
                                 PocoDirectory pocoDirectory )
    {
        using var ctx = new SqlStandardCallContext( monitor );
        int idAdmin = await SeedDemoUsersAsync( monitor, ctx, userTable, pwdTable, groupTable, workspace, pocoDirectory );
        await SeedSecondWorkspaceAsync( monitor, ctx, userTable, groupTable, workspaceTable, naming, idAdmin );
    }

    // Ensures the demo users exist with a known password.
    // AdminUser is added to Administrators (2) (and to its zone AdminZone, 3) so it gets the
    // administrator grant level (127). TestUser stays a plain member of AdminZone (16).
    static async Task<int> SeedDemoUsersAsync( IActivityMonitor monitor,
                                               SqlStandardCallContext ctx,
                                               UserTable userTable,
                                               UserPasswordTable pwdTable,
                                               GroupTable groupTable,
                                               CK.DB.Workspace.Package workspace,
                                               PocoDirectory pocoDirectory )
    {
        int idUser = await userTable.FindByNameAsync( ctx, "TestUser" );
        if( idUser <= 0 )
        {
            idUser = await userTable.CreateUserAsync( ctx, 1, "TestUser" );
            await groupTable.AddMemberAsync( ctx, 1, 3, idUser );
            await workspace.SetPreferredWorkspaceIdAsync( ctx, pocoDirectory.Create<ISetPreferredWorkspaceIdCommand>( c =>
            {
                c.ActorId = 1;
                c.UserId = idUser;
                c.WorkspaceId = 3;
            } ) );
        }
        await pwdTable.CreateOrUpdatePasswordUserAsync( ctx, 1, idUser, "success", CK.DB.Auth.UCLMode.CreateOrUpdate );

        int idAdmin = await userTable.FindByNameAsync( ctx, "AdminUser" );
        if( idAdmin <= 0 )
        {
            idAdmin = await userTable.CreateUserAsync( ctx, 1, "AdminUser" );
            await groupTable.AddMemberAsync( ctx, 1, 2, idAdmin, true );
            await workspace.SetPreferredWorkspaceIdAsync( ctx, pocoDirectory.Create<ISetPreferredWorkspaceIdCommand>( c =>
            {
                c.ActorId = 1;
                c.UserId = idAdmin;
                c.WorkspaceId = 3;
            } ) );
        }
        await pwdTable.CreateOrUpdatePasswordUserAsync( ctx, 1, idAdmin, "success", CK.DB.Auth.UCLMode.CreateOrUpdate );

        monitor.Info( "Demo users 'AdminUser' and 'TestUser' are ready (password: 'success')." );
        return idAdmin;
    }

    // Ensures a second demo workspace ("Villars") exists with a "ContentManager" group AdminUser belongs to.
    static async Task SeedSecondWorkspaceAsync( IActivityMonitor monitor,
                                                SqlStandardCallContext ctx,
                                                UserTable userTable,
                                                GroupTable groupTable,
                                                WorkspaceTable workspaceTable,
                                                CK.DB.Group.SimpleNaming.Package naming,
                                                int idAdmin )
    {
        const string workspaceName = "Villars";
        const string groupName = "ContentManager";
        try
        {
            int workspaceId = await ctx[userTable].QuerySingleOrDefaultAsync<int>(
                "select ZoneId from CK.vZone where ZoneName = @Name;",
                new { Name = workspaceName } );
            if( workspaceId <= 0 )
            {
                var ws = await workspaceTable.CreateWorkspaceAsync( ctx, 1, workspaceName );
                workspaceId = ws.WorkspaceId;
            }

            int groupId = await ctx[userTable].QuerySingleOrDefaultAsync<int>(
                "select GroupId from CK.vGroup where ZoneId = @ZoneId and GroupName = @Name;",
                new { ZoneId = workspaceId, Name = groupName } );
            if( groupId <= 0 )
            {
                groupId = await groupTable.CreateGroupAsync( ctx, 1, workspaceId );
                await naming.GroupRenameAsync( ctx, 1, groupId, groupName );
            }

            // autoAddMemberInZone also makes AdminUser a member of the Villars workspace itself.
            await groupTable.AddMemberAsync( ctx, 1, groupId, idAdmin, autoAddMemberInZone: true );
            monitor.Info( $"Demo workspace '{workspaceName}' is ready with 'AdminUser' in its '{groupName}' group." );
        }
        catch( Exception e )
        {
            // Demo data only: a failure here must not prevent the sample from starting.
            monitor.Warn( $"Could not seed the '{workspaceName}' demo workspace.", e );
        }
    }
}
