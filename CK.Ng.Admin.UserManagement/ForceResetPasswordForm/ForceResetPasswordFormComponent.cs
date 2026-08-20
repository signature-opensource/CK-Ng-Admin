using CK.Core;
using CK.Ng.UserProfile.UserPassword;
using CK.TS.Angular;

namespace CK.Ng.Admin.UserManagement;

/// <summary>
/// Modal content of the forced password reset: a single password field, pre-filled with a strong
/// value and regenerable, before a <c>ForceResetUserPasswordCommand</c> is sent.
/// <para>
/// It does not use the shared <c>GenericForm</c>: the regenerate button is a suffix of the input,
/// which <c>GenericForm</c> cannot render. The field mirrors the one of the creation flow
/// (see <see cref="EditUserFormComponent"/>).
/// </para>
/// </summary>
[NgComponent]
[Package<UserManagementTSPackage>]
[Requires<PasswordStrengthComponent>]
public sealed class ForceResetPasswordFormComponent : NgComponent
{
}
