using CK.Core;
using CK.Cris;
using CK.IO.Admin;

namespace CK.IO.UserManagement;

public interface IArchiveUsersCommand : ICommand<SimpleUserMessage>, ICommandCurrentCulture, ICommandAdmin
{
    public List<int> UserIds { get; set; }
}
