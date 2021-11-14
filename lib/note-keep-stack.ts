import * as cdk from '@aws-cdk/core';
import * as path from 'path';
import * as apigateway from "@aws-cdk/aws-apigateway";
import * as appsync from "@aws-cdk/aws-appsync";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ec2 from "@aws-cdk/aws-ec2";

export class NoteKeepStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = new apigateway.RestApi(this, 'notes-sample-api');

    api.root.addMethod('ANY');

    const notes = api.root.addResource('notes');
    notes.addMethod('GET');
    notes.addMethod('POST');

    const graphql = new appsync.GraphqlApi(this, 'Api', {
      name: 'demo',
      schema: appsync.Schema.fromAsset(path.join(path.dirname(__dirname), 'contract/schema.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.IAM,
        },
      },
      xrayEnabled: false,
    });

    const notesDynamoTable = new dynamodb.Table(this, 'NotesDynamoTable', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
    });

    const vpc = new ec2.Vpc(this, 'TheVPC', {
      cidr: "10.0.0.0/16"
    })

    // Create an ECS cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
    });

    // Add capacity to it
    cluster.addCapacity('DefaultAutoScalingGroupCapacity', {
      instanceType: new ec2.InstanceType("t2.micro"),
      desiredCapacity: 1,
    });

    const taskDefinition = new ecs.Ec2TaskDefinition(this, 'TaskDef');

    taskDefinition.addContainer('DefaultContainer', {
      image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
      memoryLimitMiB: 512,
    });

    // Instantiate an Amazon ECS Service
    const ecsService = new ecs.Ec2Service(this, 'Service', {
      cluster,
      taskDefinition,
    });
  }
}
