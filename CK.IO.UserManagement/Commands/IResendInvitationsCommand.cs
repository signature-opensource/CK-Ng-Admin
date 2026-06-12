using CK.Core;
using CK.Cris;
using CK.IO.Admin;

namespace CK.IO.UserManagement;

public interface IResendInvitationsCommand : ICommand<SimpleUserMessage>, ICommandCurrentCulture, ICommandAdmin
{
    public List<IPendingInvitation> Invitations { get; set; }
}
