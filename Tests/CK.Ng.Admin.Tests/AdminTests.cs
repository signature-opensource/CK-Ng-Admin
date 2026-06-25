using CK.Core;
using CK.Cris.AspNet;
using CK.DB.User.UserPassword;
using CK.DB.Zone;
using CK.IO.Actor;
using CK.IO.UserProfile.Workspace;
using CK.SqlServer;
using CK.Testing;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using NUnit.Framework;
using Shouldly;
using static CK.Testing.MonitorTestHelper;

namespace CK.Ng.Admin.Tests;


public class AdminTests
{
    [Test]
    public async Task CK_Ng_Admin_Async()
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
                "CK.DB.Workspace",
                "CK.Ng.UserProfile",
                "CK.Ng.UserProfile.Workspace",
                "CK.Ng.Admin",
                "CK.SqlServer.Transaction"
            ] );

        // The engine only scans assemblies listed above (DiscoverAssembliesFromPath=false by default).
        // Register the test-project types explicitly so the Cris engine picks up the override handler.
        configuration.FirstBinPath.Types.Add( typeof( TestCommandHandler ),
                                              typeof( User.UserQueries ),
                                              typeof( User.GetUserProfileCommandHandler ) );

        var tsConfig = configuration.FirstBinPath.EnsureTypeScriptConfigurationAspect( targetProjectPath,
                                                                                       typeof( IO.UserProfile.Workspace.ISetPreferredWorkspaceIdCommand ),
                                                                                       typeof( ISetUserNameCommand ),
                                                                                       typeof( IUpdateUserCommand ),
                                                                                       typeof( IGetUserProfileQCommand ),
                                                                                       typeof( IO.UserProfile.Workspace.IUserProfile ) );

        var engineRes = (await configuration.RunSuccessfullyAsync());

        var map = engineRes.LoadMap();

        #region Ensuring "TestUser" / "AdminUser" and their passwords...
        // Group ids in CK's default schema:
        //   2 = Administrators (sub-group of AdminZone, ACL grant 127)
        //   3 = AdminZone      (the platform admin zone, member grant 16)
        // TestUser is a plain member of AdminZone (grant 16 -> isAdmin must be false).
        // AdminUser is a member of Administrators (grant 127 -> isAdmin must be true).
        // CK.sGroupUserAdd requires zone membership first, so AdminUser is added to
        // AdminZone (the zone) and then to Administrators (a group inside that zone).
        var userTable = map.StObjs.Obtain<DB.Actor.UserTable>().ShouldNotBeNull();
        var pwdTable = map.StObjs.Obtain<UserPasswordTable>().ShouldNotBeNull();
        var groupTable = map.StObjs.Obtain<GroupTable>().ShouldNotBeNull();
        var w = map.StObjs.Obtain<CK.DB.Workspace.Package>().ShouldNotBeNull();
        var dir = map.StObjs.Obtain<PocoDirectory>().ShouldNotBeNull();
        using( var ctx = new SqlStandardCallContext() )
        {
            int idUser = await userTable.FindByNameAsync( ctx, "TestUser" );
            if( idUser <= 0 )
            {
                idUser = await userTable.CreateUserAsync( ctx, 1, "TestUser" );
                await groupTable.AddUserAsync( ctx, 1, 3, idUser );
                await w.SetPreferredWorkspaceIdAsync( ctx, dir.Create<ISetPreferredWorkspaceIdCommand>( c =>
                {
                    c.ActorId = 1;
                    c.UserId = idUser;
                    c.WorkspaceId = 3;
                } ) );
            }
            await pwdTable.CreateOrUpdatePasswordUserAsync( ctx, 1, idUser, "success", DB.Auth.UCLMode.CreateOrUpdate );

            int idAdmin = await userTable.FindByNameAsync( ctx, "AdminUser" );
            if( idAdmin <= 0 )
            {
                idAdmin = await userTable.CreateUserAsync( ctx, 1, "AdminUser" );
                await groupTable.AddUserAsync( ctx, 1, 2, idAdmin, true ); // Administrators (grant 127 via the shared AdminZone AclId)
            }
            await pwdTable.CreateOrUpdatePasswordUserAsync( ctx, 1, idAdmin, "success", DB.Auth.UCLMode.CreateOrUpdate );
        }
        #endregion

        var builder = WebApplication.CreateSlimBuilder();
        builder.AddUnsafeAllowAllCors();
        builder.AddWebFrontAuth( ao => ao.SlidingExpirationTime = TimeSpan.FromMinutes( 10 ) );
        await using var server = await builder.CreateRunningAspNetServerAsync( map, app => { app.UseMiddleware<CrisMiddleware>(); app.UseCris(); } );
        await using var runner = TestHelper.CreateTypeScriptRunner( targetProjectPath, server.ServerAddress );
        await TestHelper.SuspendAsync( resume => resume );
        runner.Run();
    }
}
