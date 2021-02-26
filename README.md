[![MealMatchAPI](./banner.svg)](./banner.svg)

This project contains source code and supporting files for the serverless application that powers the [MealMatch mobile application](https://github.com/garygcchiu/mealmatch-app). 

## Features
- API Gateway resources for each endpoint
- Lambda functions to handle the processing of requests
- Infrastructure as Code using CloudFormation
- [AWS Lambda Layers](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html) for: 
    - `config-utils` to retrieve secrets (i.e. API keys) from [AWS Systems Manager (SSM) Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
    - `foursquare-utils` service for consuming the Foursquare API for restaurant discovery. 
    - `logger` using [winston](https://github.com/winstonjs/winston) for logging logs to CloudWatch
    - `aws-xray` for tracing requests through each service
- CI/CD using GitHub Actions
- Separate CloudFormation Stacks For Each Environment

## Getting Started

The Serverless Application Model Command Line Interface (SAM CLI) is an extension of the AWS CLI that adds functionality for building and testing Lambda applications. It uses Docker to run your functions in an Amazon Linux environment that matches Lambda. It can also emulate your application's build environment and API.

Prerequisites:

* SAM CLI - [Install the SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
* Node.js - [Install Node.js 12 or above](https://nodejs.org/en/), including the NPM package management tool.
* Docker - [Install Docker community edition](https://hub.docker.com/search/?type=edition&offering=community)
* S3 bucket to store build artifacts for AWS SAM. 
    * Create the bucket, and set the value of `s3_bucket` in [samconfig.toml](./samconfig.toml) to the name of the bucket for each environment
* IAM User with [Programmatic Access](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html) to AWS
    * The IAM User will need the following [permissions](https://aws.amazon.com/iam/features/manage-permissions/) on the Resource `arn:aws:iam::[your AWS account ID]:role/*`:
        * "iam:TagRole"
        * "iam:CreateRole"
        * "iam:DeleteRole"
        * "iam:AttachRolePolicy"
        * "iam:DetachRolePolicy"
        * "iam:TagUser"
    * When deploying manually, you will need to [configure your AWS CLI with the profile of the user](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html), and update the [package.json](./package.json)'s `deployStack` command to use the profile.
    * When deploying via CI/CD, you will need to update the [GitHub Actions Secrets](https://docs.github.com/en/free-pro-team@latest/actions/reference/encrypted-secrets) with your `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` for the user.

To build and deploy your application for the first time, run the following in your shell:

```bash
npm run deployDev
or
npm run deployStaging
or
npm run deployProd
```

The command will build the source of your application, package, and deploy your application to AWS, with a series of prompts:

You can find your API Gateway Endpoint URL in the output values displayed after deployment.

## Use the SAM CLI to build and test locally

To [start API Gateway locally](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-using-start-api.html), use the `npm run dev` command.

```bash
$ npm run dev
```

Test a single function by invoking it directly with a test event. An event is a JSON document that represents the input that the function receives from the event source. Test events are included in the `events` folder in this project.

Run functions locally and invoke them with the `npm run local` command.

```bash
$ npm run local
```

The SAM CLI reads the application template to determine the API's routes and the functions that they invoke. The `Events` property on each function's definition includes the route and method for each path.

```yaml
      Events:
        Sample:
          Type: Api
          Properties:
            Path: /sample
            Method: get
```

## Documentation 
The application uses several AWS resources, including Lambda functions and an API Gateway API. These resources are defined in the `template.yaml` file in this project. You can update the template to add AWS resources through the same deployment process that updates your application code.

Each folder inside `./src` represents a Lambda that handles the requests from API Gateway. 

## Cleanup

To delete the sample application that you created, use the AWS CLI. Assuming you used your project name for the stack name, you can run the following:

```bash
aws cloudformation delete-stack --stack-name kickstarter-api
```

## Contributing 

Looking to contribute? Visit the [Trello board](https://trello.com/b/5cjVYplA/mealmatchio) to see what is prioritized, in the backlog, in progress, etc. Feel free to shoot me an email at gary.gc.chiu@gmail.com or open a PR if you're interested!

## Resources

See the [AWS SAM developer guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html) for an introduction to SAM specification, the SAM CLI, and serverless application concepts.

Next, you can use AWS Serverless Application Repository to deploy ready to use Apps that go beyond hello world samples and learn how authors developed their applications: [AWS Serverless Application Repository main page](https://aws.amazon.com/serverless/serverlessrepo/)
