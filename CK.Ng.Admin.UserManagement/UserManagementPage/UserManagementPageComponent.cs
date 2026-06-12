using CK.Core;
using CK.Ng.Zorro;
using CK.TS.Angular;

namespace CK.Ng.Admin.UserManagement;

[NgRoutedComponent<AdminPageComponent>( Route = "user", RegistrationMode = RouteRegistrationMode.Lazy )]
[Requires<LayoutComponent>]
[Requires<InvitationsTableComponent>]
[Package<UserManagementTSPackage>]
public sealed class UserManagementPageComponent : NgRoutedComponent
{
}
