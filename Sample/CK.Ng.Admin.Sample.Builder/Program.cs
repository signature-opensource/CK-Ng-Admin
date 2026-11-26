using CK.Core;
using CK.Setup;
using Microsoft.Data.SqlClient;
using System;

return await CKomposableAppBuilder.RunAsync( ( monitor, builder ) =>
{
    // The CKSetup.xml targets the local SQL Server with the Windows account. A machine that has no such server
    // (Linux, a container) already gives its server to the tests with this environment variable (see CK.Testing.SqlServer):
    // the builder uses the same server and keeps the database name of the CKSetup.xml.
    var master = Environment.GetEnvironmentVariable( "TestHelper__SqlServer__MasterConnectionString" );
    if( !String.IsNullOrEmpty( master ) )
    {
        var sql = builder.EngineConfiguration.EnsureAspect<SqlSetupAspectConfiguration>();
        var database = new SqlConnectionStringBuilder( sql.DefaultDatabaseConnectionString ).InitialCatalog;
        sql.DefaultDatabaseConnectionString = new SqlConnectionStringBuilder( master ) { InitialCatalog = database }.ConnectionString;
        monitor.Info( $"Database '{database}': using the SQL Server of the 'TestHelper__SqlServer__MasterConnectionString' environment variable." );
    }
} );
