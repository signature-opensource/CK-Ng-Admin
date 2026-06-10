using CK.Core;
using CK.TS.Angular;

namespace CK.Ng.Admin.UserManagement;

[NgRoutedComponent<AdminPageComponent>( Route = "user", RegistrationMode = RouteRegistrationMode.Lazy )]
[Package<UserManagementTSPackage>]
public sealed class UserManagementPageComponent : NgRoutedComponent
{
}
