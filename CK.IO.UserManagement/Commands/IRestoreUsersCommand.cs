using CK.Core;
using CK.Cris;
using CK.IO.Admin;

namespace CK.IO.UserManagement;

public interface IRestoreUsersCommand : ICommand<SimpleUserMessage>, ICommandCurrentCulture, ICommandAdmin
{
    public List<int> UserIds { get; set; }
}
