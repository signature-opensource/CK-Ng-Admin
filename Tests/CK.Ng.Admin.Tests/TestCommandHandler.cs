using CK.Core;
using CK.Cris;
using CK.DB.Actor;
using CK.IO.Actor;
using CK.SqlServer;

namespace CK.Ng.Admin.Tests;

[RealObject]
public class TestCommandHandler : IRealObject
{
    [CommandHandler]
    public async Task<IUpdateUserCommandResult> UpdateUserAsync( ISqlTransactionCallContext ctx,
                                                                 IUpdateUserCommand cmd,
                                                                 UserTable table,
                                                                 CrisBackgroundExecutor exec,
                                                                 PocoDirectory pocoDir )
    {
        var result = cmd.CreateResult<IUpdateUserCommandResult>();
        using( var transaction = ctx[table].BeginTransaction() )
        {
            foreach( var batched in cmd.Commands )
            {
                var execCmd = exec.Submit( ctx.Monitor, batched.Command, incomingValidationCheck: true );
                var executedCommand = await execCmd.ExecutedCommand;

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
