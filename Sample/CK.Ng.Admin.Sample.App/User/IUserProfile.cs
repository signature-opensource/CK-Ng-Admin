using CK.IO.User.PreferredCulture;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CK.Ng.Admin.Sample.App.User;

public interface IUserProfile : CK.IO.User.PreferredCulture.IUserProfile, CK.IO.UserProfile.Workspace.IUserProfile
{
}
