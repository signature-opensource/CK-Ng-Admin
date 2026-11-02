using CK.Core;
using CK.Ng.AspNet.Auth;
using CK.Ng.UserProfile.UserPassword;
using CK.TS.Angular;

namespace CK.Ng.Admin.UserManagement;

[NgRoutedComponent<AuthenticationPageComponent>( Route = "register/:token", RegistrationMode = RouteRegistrationMode.Lazy )]
[Package<UserInvitation.UserManagementUserInvitationPackage>]
[Requires<PasswordStrengthComponent>]
[Requires<Zorro.GenericFormComponent>]
public sealed class RegisterComponent : NgRoutedComponent
{
}
