import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as certmanager from "aws-cdk-lib/aws-certificatemanager";

export interface CertificateStackProps  {
  zoneDomainName: string;
  websiteDomainName: string;
}

export class CertificateConstruct extends Construct {

  public websiteCertificate: certmanager.ICertificate;

  constructor(scope: Construct, id: string, props: CertificateStackProps) {
    super(scope, id);

    const hostedZone = route53.HostedZone.fromLookup(this, "domain-zone", {
      domainName: props.zoneDomainName,
    });

    const websiteCert = new certmanager.Certificate(this, "certificate", {
      domainName: props.websiteDomainName,
      validation: certmanager.CertificateValidation.fromDns(hostedZone),
    });

    this.websiteCertificate = websiteCert


    // ###################################################
    // Outputs
    // ###################################################
    new cdk.CfnOutput(this, "certificateArn", {
      value: websiteCert.certificateArn,
    });

  }
}