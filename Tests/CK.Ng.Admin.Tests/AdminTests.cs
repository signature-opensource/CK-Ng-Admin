using CK.Core;
using CK.Cris;
using CK.Cris.AspNet;
using CK.DB.User.UserPassword;
using CK.IO.Actor;
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

        var tsConfig = configuration.FirstBinPath.EnsureTypeScriptConfigurationAspect( targetProjectPath,
                                                                                       typeof( IO.UserProfile.Workspace.ISetPreferredWorkspaceIdCommand ),
                                                                                       typeof( ISetUserNameCommand ),
                                                                                       typeof( IUpdateUserCommand ),
                                                                                       typeof( IGetUserProfileQCommand ),
                                                                                       typeof( IUserProfile ) );

        var engineRes = (await configuration.RunSuccessfullyAsync());

        var map = engineRes.LoadMap();

        #region Ensuring "TestUser" and its password...
        var userTable = map.StObjs.Obtain<DB.Actor.UserTable>().ShouldNotBeNull();
        var pwdTable = map.StObjs.Obtain<UserPasswordTable>().ShouldNotBeNull();
        using( var ctx = new SqlStandardCallContext() )
        {
            int idUser = await userTable.FindByNameAsync( ctx, "TestUser" );
            if( idUser <= 0 )
            {
                idUser = await userTable.CreateUserAsync( ctx, 1, "TestUser" );
            }
            await pwdTable.CreateOrUpdatePasswordUserAsync( ctx, 1, idUser, "success", DB.Auth.UCLMode.CreateOrUpdate );
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
