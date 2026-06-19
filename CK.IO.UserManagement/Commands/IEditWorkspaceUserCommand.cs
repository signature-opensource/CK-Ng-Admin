using CK.Core;
using CK.Cris;
using CK.IO.Admin;

namespace CK.IO.UserManagement;

public interface IEditWorkspaceUserCommand : ICommand<SimpleUserMessage>, ICommandCurrentCulture, ICommandAdmin
{
    public int UserId { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string UserName { get; set; }
    public string CultureName { get; set; }
    public List<int> Groups { get; set; }
    public string? Password { get; set; }
}
