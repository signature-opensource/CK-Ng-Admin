# The sample application

A runnable back office over the packages of this repository: an Angular application with the `/admin`
page, the user management and the user profile, on a host that is its own AuthCenter (Basic login).

| Project | Role |
|---|---|
| `CK.Ng.Admin.Sample.App` | The application: its packages, `AdminSamplePackage` (its TypeScript package), its commands and `DemoData` (the demo data seeded when the host starts). |
| `CK.Ng.Admin.Sample.Builder` | Runs the engine (`CKSetup.xml`): the database `AdminSampleDB_LOCAL` on the local SQL Server, the generated code of the host and the `ck-gen` of the client application. |
| `CK.Ng.Admin.Sample.Host` | The host: a CK.AppHost party (`Program.cs` is `await CK.Core.CKomposableAppHost.RunAsync( args );`) whose web server is its "HttpEndpoint" feature. |

## The host

The configuration is in `CK.Ng.Admin.Sample.Host/appsettings.json`: the party `AdminSample/$Server` allows the
`AuthCenter` and `HttpEndpoint` features, and its `Main` endpoint is `http://localhost:5500`.

The client application is the Angular project `CK.Ng.Admin.Sample.Host/Clients/App` (the `<TypeScript Name="App"
Kind="DefaultApp" DevServerPort="4500">` of the builder's `CKSetup.xml`), served at `/` by CK.TS.AspNet.Clients on the
origin of the host: in Development through its dev server (`ng serve --port 4500`, started with the host), otherwise
from its `dist`.

## Running it

Build the host (it builds the builder, which runs the engine), then run `#Dev/Start.ps1` from the root of the
repository, or start the host in Development (`DOTNET_ENVIRONMENT=Development`, from its project folder), and open
`http://localhost:5500`.

The demo users (password `success`):

| User | Rights |
|---|---|
| `AdminUser` | Member of the Administrators group: an administrator. Also in the `ContentManager` group of a second workspace, `Villars`. |
| `TestUser` | Plain member of the AdminZone. |
