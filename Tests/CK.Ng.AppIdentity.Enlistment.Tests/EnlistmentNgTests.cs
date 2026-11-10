using CK.Core;
using CK.DB.User.UserPassword;
using CK.SqlServer;
using CK.Testing;
using NUnit.Framework;
using Shouldly;
using static CK.Testing.MonitorTestHelper;

namespace CK.Ng.AppIdentity.Enlistment.Tests;

/// <summary>
/// Drives the TypeScript inline tests of the approval page: an application that is its own AuthCenter (with its HTTP
/// front), "TestUser" (password "success") to sign in at the Critical level, and the <see cref="FakeApprovalHandler"/>.
/// </summary>
public class EnlistmentNgTests
{
    [Test]
    public async Task CK_Ng_AppIdentity_Enlistment_Async()
    {
        var targetProjectPath = TestHelper.GetTypeScriptInlineTargetProjectPath();

        var configuration = TestHelper.CreateDefaultEngineConfiguration();
        configuration.FirstBinPath.Path = TestHelper.BinFolder;
        configuration.EnsureSqlServerConfigurationAspect();

        configuration.FirstBinPath.AddAuthCenterApplication();
        configuration.FirstBinPath.Assemblies.AddRange( [
                "CK.Ng.Cris.AspNet.Authentication.Basic",
                "CK.DB.User.UserPassword",
                "CK.Ng.AppIdentity.Enlistment",
                "CK.SqlServer.Transaction"
            ] );
        configuration.FirstBinPath.Types.Add( typeof( FakeApprovalHandler ) );
        configuration.FirstBinPath.EnsureTypeScriptConfigurationAspect( targetProjectPath );

        var engineRes = await configuration.RunSuccessfullyAsync();
        var map = engineRes.LoadMap();

        var userTable = map.StObjs.Obtain<DB.Actor.UserTable>().ShouldNotBeNull();
        var pwdTable = map.StObjs.Obtain<UserPasswordTable>().ShouldNotBeNull();
        using( var ctx = new SqlStandardCallContext() )
        {
            int idUser = await userTable.FindByNameAsync( ctx, "TestUser" );
            if( idUser <= 0 ) idUser = await userTable.CreateUserAsync( ctx, 1, "TestUser" );
            await pwdTable.CreateOrUpdatePasswordUserAsync( ctx, 1, idUser, "success", DB.Auth.UCLMode.CreateOrUpdate );
        }

        await using var server = await map.CreateRunningAuthCenterApplicationAsync();
        await using var runner = TestHelper.CreateTypeScriptRunner( targetProjectPath, server.ServerAddress );
        await TestHelper.SuspendAsync( resume => resume );
        runner.Run();
    }
}
