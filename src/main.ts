import * as core from '@actions/core'
import { Octokit } from '@octokit/core'
import { App } from '@octokit/app'

function getRepositoryOwner(): string {
    const repositoryOwner = core.getInput('repository-owner')
    if (repositoryOwner) {
      return repositoryOwner
    }

    const repository = core.getInput('repository')
    if (!repository) {
      throw new Error('No repository-owner or repostiory supplied to the action')
    }

    const parts = repository.split('/')
    if (parts.length != 2) {
      throw new Error(`Malformed repository input '${repository}'`)
    }

    return parts[0]
}

async function run(): Promise<void> {

  try {
    // Verify inputs
    const applicationId = core.getInput('application-id')
    if (!applicationId) {
      throw new Error('No application-id supplied to the action')
    }

    const privateKey = core.getInput('private-key')
    if (!privateKey) {
      throw new Error('No private-key supplied to the action')
    }

    const repositoryOwner = getRepositoryOwner().toLowerCase()

    // Authenticate as our application
    const app = new App({
      appId: applicationId,
      privateKey: privateKey,
    })

    {
      const { data } = await app.octokit.request("/app")
      console.log(`Authenticated as application ${data.name}`)
    }

    for await (const {octokit, installation} of app.eachInstallation.iterator()) {
      if (installation.account!.login!.toLowerCase() == repositoryOwner) {
        core.setOutput('installation-id', installation.id)
        return
      }
    }

    throw new Error(`Did not find an application installation for '${repositoryOwner}'`)

  } catch (err: any) {
    if (err instanceof Error) {
      const error = err as Error
      core.setFailed(error.message)
    } else {
      throw(err)
    }
  }
}

run()
