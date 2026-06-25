using CK.Core;
using CK.Cris.AspNet;
using CK.DB.Acl;
using CK.DB.User.UserPassword;
using CK.DB.Zone;
using CK.IO.Actor;
using CK.IO.UserManagement;
using CK.SqlServer;
using CK.Testing;
using Dapper;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using NUnit.Framework;
using Shouldly;
using static CK.Testing.MonitorTestHelper;
using GroupTable = CK.DB.Zone.GroupTable;

namespace CK.Ng.Admin.UserManagement.Tests;

/// <summary>
/// Drives the TypeScript inline tests of the <c>CK.Ng.Admin.UserManagement</c> Angular library:
/// boots the CK engine (registering the NG components + the CK.UserManagement backend handlers),
/// provisions a workspace with an admin (<c>UMAdmin</c>) and a plain member (<c>UMMember</c>), starts
/// an ASP.NET server and runs Jest against it. Mirrors <c>CK.Ng.Admin.Tests.AdminTests</c>.
/// </summary>
public class UserManagementNgTests
{
    [Test]
    public async Task CK_Ng_Admin_UserManagement_Async()
    {
        var targetProjectPath = TestHelper.GetTypeScriptInlineTargetProjectPath();

        var configuration = TestHelper.CreateDefaultEngineConfiguration();
        configuration.FirstBinPath.Path = TestHelper.BinFolder;
        configuration.EnsureSqlServerConfigurationAspect();

        configuration.FirstBinPath.Assemblies.AddRange( [
            "CK.Cris.Auth",
            "CK.Ng.Cris.AspNet.Auth",
            "CK.DB.AspNet.Auth",
            "CK.Ng.AspNet.Auth.Basic",
            "CK.DB.User.UserPassword",
            "CK.DB.User.NamedUser",
            "CK.DB.User.PreferredCulture",
            "CK.DB.User.BinnedUser",
            "CK.DB.Actor.ActorEMail",
            "CK.DB.UserInvitation",
            "CK.DB.Workspace",
            "CK.DB.Zone",
            "CK.DB.Acl",
            "CK.DB.Globalization",
            "CK.Ng.UserProfile",
            "CK.Ng.UserProfile.Workspace",
            "CK.Ng.UserProfile.UserPassword",
            "CK.Ng.Zorro.BackOffice",
            "CK.Ng.Admin",
            "CK.Ng.Admin.UserManagement",
            "CK.UserManagement",
            "CK.SqlServer.Transaction"
        ] );

        // Test-project types: the enriched user-profile handler (for the isAdmin signal) and the
        // FakeUserManagementMailer (replaces the real mailer so invitation commands succeed).
        configuration.FirstBinPath.Types.Add( typeof( FakeUserManagementMailer ),
                                              typeof( User.UserQueries ),
                                              typeof( User.GetUserProfileCommandHandler ) );

        var tsConfig = configuration.FirstBinPath.EnsureTypeScriptConfigurationAspect( targetProjectPath,
            typeof( IO.UserProfile.Workspace.ISetPreferredWorkspaceIdCommand ),
            typeof( ISetUserNameCommand ),
            typeof( IUpdateUserCommand ),
            typeof( IGetUserProfileQCommand ),
            typeof( IO.UserProfile.Workspace.IUserProfile ),
            // User-management commands (also registered by UserManagementTSPackage).
            typeof( ICreateInvitationCommand ),
            typeof( IEditWorkspaceUserCommand ),
            typeof( IArchiveUsersAdminCommand ),
            typeof( IRestoreUsersAdminCommand ),
            typeof( IResendInvitationsCommand ),
            typeof( IValidateInvitationTokenCommand ),
            typeof( ICompleteRegistrationCommand ),
            typeof( IGetWorkspaceUsersQCommand ),
            typeof( IGetWorkspaceInvitationDataQCommand ),
            typeof( IGetWorkspaceUserEditDataQCommand ),
            typeof( IGetWorkspacePendingInvitationsQCommand ),
            typeof( IGetPlatformPendingInvitationsQCommand ) );

        var engineRes = await configuration.RunSuccessfullyAsync();
        var map = engineRes.LoadMap();

        #region Ensuring "UMAdmin" (workspace admin) and "UMMember" (plain member) with a workspace.
        var userTable = map.StObjs.Obtain<DB.Actor.UserTable>().ShouldNotBeNull();
        var pwdTable = map.StObjs.Obtain<UserPasswordTable>().ShouldNotBeNull();
        var groupTable = map.StObjs.Obtain<GroupTable>().ShouldNotBeNull();
        var workspacePackage = map.StObjs.Obtain<CK.DB.Workspace.Package>().ShouldNotBeNull();
        var workspaceTable = map.StObjs.Obtain<CK.DB.Workspace.WorkspaceTable>().ShouldNotBeNull();
        var aclTable = map.StObjs.Obtain<AclTable>().ShouldNotBeNull();

        using( var ctx = new SqlStandardCallContext() )
        {
            int idAdmin = await userTable.FindByNameAsync( ctx, "UMAdmin" );
            if( idAdmin <= 0 )
            {
                idAdmin = await userTable.CreateUserAsync( ctx, 1, "UMAdmin" );
            }
            int workspaceId = await ctx[userTable].QuerySingleOrDefaultAsync<int>(
                "select PreferredWorkspaceId from CK.tUser where UserId = @Id;", new { Id = idAdmin } );
            if( workspaceId <= 0 )
            {
                var ws = await workspaceTable.CreateWorkspaceAsync( ctx, 1, "UMWorkspace" );
                workspaceId = ws.WorkspaceId;
                int aclId = await ctx[userTable].QuerySingleOrDefaultAsync<int>(
                    "select AclId from CK.tWorkspace where WorkspaceId = @WorkspaceId;", new { WorkspaceId = workspaceId } );
                await aclTable.AclGrantSetAsync( ctx, 1, aclId, idAdmin, "UMWorkspaceAdmin", 127 );
                await workspacePackage.SetUserPreferredWorkspaceAsync( ctx, 1, idAdmin, workspaceId );
                // A spare group inside the workspace zone for the forms/group-picker.
                await groupTable.CreateGroupAsync( ctx, 1, workspaceId );
            }
            // Ensure UMAdmin is a member of the workspace zone (idempotent): the Angular UserService
            // resolves the current workspace from the profile's groups, so the ACL grant alone is not
            // enough — the user must also belong to the zone group. The ACL grant (127) makes the
            // profile report admin grant level on it.
            await groupTable.AddUserAsync( ctx, 1, workspaceId, idAdmin, true );
            await pwdTable.CreateOrUpdatePasswordUserAsync( ctx, 1, idAdmin, "success", DB.Auth.UCLMode.CreateOrUpdate );

            int idMember = await userTable.FindByNameAsync( ctx, "UMMember" );
            if( idMember <= 0 )
            {
                idMember = await workspacePackage.CreateUserAsync( ctx, 1, "UMMember", workspaceId );
            }
            await groupTable.AddUserAsync( ctx, 1, workspaceId, idMember, true );
            await workspacePackage.SetUserPreferredWorkspaceAsync( ctx, 1, idMember, workspaceId );
            await pwdTable.CreateOrUpdatePasswordUserAsync( ctx, 1, idMember, "success", DB.Auth.UCLMode.CreateOrUpdate );
        }
        #endregion

        var builder = WebApplication.CreateSlimBuilder();
        // CK.UserManagement transitively pulls CK.AppIdentity (via CK.Mailer): provide a minimal
        // AppIdentity configuration so its hosted ApplicationIdentityService can start.
        builder.Configuration.AddInMemoryCollection( new Dictionary<string, string?>
        {
            ["CK-AppIdentity:FullName"] = "UMTest/$Server",
            ["CK-AppIdentity:Local:FrontUrl"] = "http://localhost:4200"
        } );
        builder.AddApplicationIdentityServiceConfiguration();
        builder.AddUnsafeAllowAllCors();
        builder.AddWebFrontAuth( ao => ao.SlidingExpirationTime = TimeSpan.FromMinutes( 10 ) );
        await using var server = await builder.CreateRunningAspNetServerAsync( map, app => { app.UseMiddleware<CrisMiddleware>(); app.UseCris(); } );
        await using var runner = TestHelper.CreateTypeScriptRunner( targetProjectPath, server.ServerAddress );
        await TestHelper.SuspendAsync( resume => resume );
        runner.Run();
    }
}
