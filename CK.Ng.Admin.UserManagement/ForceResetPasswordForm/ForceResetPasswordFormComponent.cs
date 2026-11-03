using CK.Core;
using CK.Ng.UserProfile.UserPassword;
using CK.TS.Angular;

namespace CK.Ng.Admin.UserManagement;

/// <summary>
/// Modal content of the forced password reset: a single password field, pre-filled with a strong
/// value and regenerable, before a <c>ForceResetUserPasswordCommand</c> is sent.
/// <para>
/// The password is a custom field rendered by the shared <c>GenericForm</c>; its template, declared
/// here, carries the input, its regenerate suffix button and the strength meter. It mirrors the
/// password field of the creation flow (see <see cref="EditUserFormComponent"/>).
/// </para>
/// </summary>
[NgComponent]
[Package<UserManagementTSPackage>]
[Requires<PasswordStrengthComponent>]
[Requires<Zorro.GenericFormComponent>]
public sealed class ForceResetPasswordFormComponent : NgComponent
{
}
