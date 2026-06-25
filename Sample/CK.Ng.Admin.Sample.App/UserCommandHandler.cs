using CK.Core;
using CK.Cris;
using CK.DB.Actor;
using CK.IO.Actor;
using CK.SqlServer;

namespace CK.Ng.Admin.Sample.App;

[RealObject]
public class UserCommandHandler : IRealObject
{
    [CommandHandler]
    public async Task<IUpdateUserCommandResult> UpdateUserAsync( ISqlTransactionCallContext ctx,
                                                                 IUpdateUserCommand cmd,
                                                                 UserTable table,
                                                                 ICrisCommandContext commandCtx,
                                                                 PocoDirectory pocoDir )
    {
        var result = cmd.CreateResult<IUpdateUserCommandResult>();
        using( var transaction = ctx[table].BeginTransaction() )
        {
            foreach( var batched in cmd.Commands )
            {
                var executedCommand = await commandCtx.ExecuteAsync( batched.Command );

                // upcoming:
                // var executedCommand = await execCmd.SuccessfulCommand;
                // -> throws if not successful

                if( executedCommand.Result is ICrisResultError err )
                {
                    throw new CKException( err.Errors.FirstOrDefault().Text ?? "Error while handling Cris command, missing message." );
                }

                var cmdResult = pocoDir.Create<IPocoCommandExecutedCommandResult>();
                cmdResult.Initialize( executedCommand );
                result.Results.Add( cmdResult );
            }
            transaction.Commit();
        }

        return result;
    }
}
