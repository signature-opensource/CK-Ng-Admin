using CK.Core;
using CK.Ng.AspNet.Auth;
using CK.TS.Angular;

namespace CK.Ng.Admin.UserManagement;

[NgRoutedComponent<AuthenticationPageComponent>( Route = "register/:token" )]
[Package<UserManagementTSPackage>]
public sealed class RegisterComponent : NgRoutedComponent
{
}
