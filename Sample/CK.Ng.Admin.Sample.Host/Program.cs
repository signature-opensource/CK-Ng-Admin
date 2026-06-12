using CK.Core;
using CK.DB.Actor;
using CK.DB.User.UserPassword;
using CK.IO.UserProfile.Workspace;
using CK.SqlServer;
using Microsoft.AspNetCore.Authentication;
using System.Reflection;

var builder = WebApplication.CreateBuilder( args );
builder.UseCKMonitoring();
builder.AddApplicationIdentityServiceConfiguration();

var monitor = builder.GetBuilderMonitor();
var localePath = $"{builder.Environment.ContentRootPath}\\locales";
monitor.Info( $"Setting Locale translation files path to: {localePath}." );
GlobalizationFileHelper.SetLocaleTranslationFiles( monitor, localePath );
monitor.Info( "Globalization files should have been loaded." );

builder.Services.AddControllers();
builder.Services.AddCors();
builder.Services.AddHttpClient();

var authBuilder = new AuthenticationBuilder( builder.Services );

builder.AddWebFrontAuth( o => {
    o.ExpireTimeSpan = TimeSpan.FromHours( 1 );
    o.SlidingExpirationTime = TimeSpan.FromHours( 1 );
    o.SchemesCriticalTimeSpan = new Dictionary<string, TimeSpan>
    {
        { "Basic", new TimeSpan( 0, 5, 0 ) }
    };
} );

var map = StObjContextRoot.Load( Assembly.GetExecutingAssembly(), builder.GetBuilderMonitor() );

var cs = builder.Configuration["ConnectionStrings:AdminSampleDB"];
if( cs is not null )
{
    map!.StObjs.Obtain<SqlDefaultDatabase>()!.ConnectionString = cs;
}

// Seed demo accounts so you can log in right away (Basic provider):
//   - "AdminUser" / "success" -> member of the Administrators group (grant 127): isAdmin == true.
//   - "TestUser"  / "success" -> plain member of the AdminZone (grant 16):       isAdmin == false.
// Group ids in CK's default schema: 2 = Administrators, 3 = AdminZone.
await SeedDemoUsersAsync( map!, monitor );

var app = builder.CKBuild( map );

app.UseRouting();
app.UseAuthentication();
app.UseCors( c => c.SetIsOriginAllowed( host => true )
                   .AllowAnyMethod()
                   .AllowAnyHeader()
                   .AllowCredentials() );
app.UseAuthorization();
app.UseStaticFiles();
app.UseCris();
app.UseSpa( ( b ) =>
{
    if( builder.Environment.IsDevelopment() )
    {
        b.UseProxyToSpaDevelopmentServer( "http://localhost:4200" );
    }
} );

await app.RunAsync();

// Ensures the demo users exist with a known password.
// AdminUser is added to AdminZone (3) then to Administrators (2) so it gets the
// administrator grant level (127). TestUser stays a plain member of AdminZone (16).
static async Task SeedDemoUsersAsync( IStObjMap map, IActivityMonitor monitor )
{
    var userTable = map.StObjs.Obtain<UserTable>()!;
    var pwdTable = map.StObjs.Obtain<UserPasswordTable>()!;
    var groupTable = map.StObjs.Obtain<GroupTable>()!;
    var workspace = map.StObjs.Obtain<CK.DB.Workspace.Package>()!;
    var dir = map.StObjs.Obtain<PocoDirectory>()!;

    using var ctx = new SqlStandardCallContext( monitor );

    int idUser = await userTable.FindByNameAsync( ctx, "TestUser" );
    if( idUser <= 0 )
    {
        idUser = await userTable.CreateUserAsync( ctx, 1, "TestUser" );
        await groupTable.AddUserAsync( ctx, 1, 3, idUser );
        await workspace.SetPreferredWorkspaceIdAsync( ctx, dir.Create<ISetPreferredWorkspaceIdCommand>( c =>
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
        await groupTable.AddUserAsync( ctx, 1, 2, idAdmin );
    }
    await pwdTable.CreateOrUpdatePasswordUserAsync( ctx, 1, idAdmin, "success", CK.DB.Auth.UCLMode.CreateOrUpdate );

    monitor.Info( "Demo users 'AdminUser' and 'TestUser' are ready (password: 'success')." );
}
