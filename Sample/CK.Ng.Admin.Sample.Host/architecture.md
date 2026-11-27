<!-- Generated from CK.Ng.Admin.Sample.Builder/ckonf.json: do not edit. -->
# The App 'CK.Ng.Admin.$Sample'

Its run time configuration is `appsettings.json`; this document describes it from its content and its compile time choices.

## The projects

- The App: `../CK.Ng.Admin.Sample.App`
- The Builder: `../CK.Ng.Admin.Sample.Builder`

## The type set

The types of the packages of the App project (discovered from its folder).

## The configurable types by package

| Package | Configurable types |
|---|---|
| CK.AppIdentity | DevRunningStatus |
| CK.AppIdentity.AuthCenter.Local | AuthCenter |
| CK.AppIdentity.AuthCenter.Password | Password |
| CK.AppIdentity.AuthCenter.Remote | AuthCenterRemote |
| CK.AppIdentity.Cris | CrisChannel |
| CK.AppIdentity.HttpEndpoint | ForwardedHeaders, HttpEndpoint |
| CK.AppIdentity.KeyManagement | KeyManagement |
| CK.AppIdentity.PartyClient | PartyClient |
| CK.AppIdentity.TransportLayer | Transport |
| CK.Globalization.StObj | Globalization |
| CK.Mailer | MailSender |
| CK.Mailer.MailKit | MailKit |
| CK.SqlServer.Setup.Model | SqlServer |
| CK.TS.Angular | NgApp |
| CK.TS.AspNet.Clients | Hosting, StaticFiles |
| CK.UserManagement.UserInvitation | UserInvitation |
| CK.UserProfile.UserPassword.Lost | PasswordLost |

## The aspects

### AppContext aspect `SqlServer`

Package: `CK.SqlServer.Setup.Model`

| Key | Value |
|---|---|
| DefaultDatabaseConnectionString | *(secret)* |
| Databases | *(contains secrets)* *(default)* |
| GlobalResolution | `false` *(default)* |
| IgnoreMissingDependencyIsError | `false` *(default)* |

### App aspect `Globalization`

Package: `CK.Globalization.StObj`

| Key | Value |
|---|---|
| ActiveCultures | `fr` |

## The party '$Server'

- Full name: `AdminSample/$Server/#Dev`

### Feature `HttpEndpoint`

Package: `CK.AppIdentity.HttpEndpoint`

### Feature `AuthCenter`

Package: `CK.AppIdentity.AuthCenter.Local`

Options: `PasswordLost`

### Feature `MailSender`

Package: `CK.Mailer`

Options: `MailKit`

### Feature `PartyClient`

Package: `CK.AppIdentity.PartyClient`

## The client 'App' of '$Server'

### Client feature `NgApp`

Package: `CK.TS.Angular`

Build time:

| Key | Value |
|---|---|
| RequestPath | `/` |
| DevServerPort | `4500` |
| TargetProjectPath | *(none)* *(default)* |
| DefaultTypeScriptVersion | *(none)* *(default)* |
| IntegrationMode | `Inline` |
| InstallYarn | *(none)* *(default)* |
| GitIgnoreCKGenFolder | *(none)* *(default)* |
| AutoInstallJest | *(none)* *(default)* |
| EnableTSProjectReferences | *(none)* *(default)* |
| DefaultCulture | `fr` |
| ActiveCultures | `fr-CA`, `de-be`, `nl-BE`, `zh` |
| TypeFilterName | *(none)* *(default)* |
| Barrels | *(none)* *(default)* |
| Types | *(none)* *(default)* |

### Client feature `Hosting`

Package: `CK.TS.AspNet.Clients`
