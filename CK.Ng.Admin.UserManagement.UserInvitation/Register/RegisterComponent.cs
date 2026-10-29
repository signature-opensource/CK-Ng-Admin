using CK.Core;
using CK.Ng.Cris.AspNet.Authentication;
using CK.Ng.UserProfile.UserPassword;
using CK.TS.Angular;

namespace CK.Ng.Admin.UserManagement;

[NgRoutedComponent<AuthenticationPageComponent>( Route = "register/:token", RegistrationMode = RouteRegistrationMode.Lazy )]
[Package<UserInvitation.UserManagementUserInvitationPackage>]
[Requires<PasswordStrengthComponent>]
public sealed class RegisterComponent : NgRoutedComponent
{
}
