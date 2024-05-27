import {Duration, Stack} from "aws-cdk-lib";
import {
  Dashboard,
  GraphWidget,
  GraphWidgetView,
  LegendPosition,
  Metric,
  Row, TextWidget,
  SingleValueWidget,
  IMetric
} from 'aws-cdk-lib/aws-cloudwatch';
import {Construct} from "constructs";

import _importedTokenMetricsDef from './metrics/token-metric-definition.json'
import _importedBedrockInvocationCountDef from './metrics/invocation_model_count.json'
import _importedBedrockInvocationThroughputDef from './metrics/invocation_model_throughput.json'
import {IFunction} from "aws-cdk-lib/aws-lambda";

const importedTokenMetricsDef = _importedTokenMetricsDef as (string|CloudWatchMetricImportProps)[][]
const importedBedrockInvocationCountDef = _importedBedrockInvocationCountDef as (string|CloudWatchMetricImportProps)[][]
const importedBedrockInvocationThroughputDef = _importedBedrockInvocationThroughputDef as (string|CloudWatchMetricImportProps)[][]

interface CloudWatchMetricImportProps {
  period: number
  stat: string
  label:string
  region:string
}


export interface FoodAnalyzerDashboardProps {
  stage: string
  functionList : IFunction[]
}



export class FoodAnalyzerDashBoard extends Construct {
  constructor(scope: Construct, id: string, props: FoodAnalyzerDashboardProps) {
    super(scope, id);




    const dashboard = new Dashboard(this, 'FoodAnalyzerDashboard', {
      defaultInterval: Duration.days(7),
      dashboardName: `food-analyzer-dashbord-${props.stage}`
    });




    /*
     * Bedrock metric definition
     */

    const titleWidget = new TextWidget({
      width: 24,
      height: 2,
      markdown: "\n\n# FoodAnalyzer Observability Dashboard"
    })
    dashboard.addWidgets(new Row(titleWidget))

    const bedrocksectionWidget = new TextWidget({
      width: 24,
      height: 2,
      markdown: "\n\n## Bedrock"
    })
    dashboard.addWidgets(new Row(bedrocksectionWidget))

    const invocationCountMetrics :IMetric[] =  importedBedrockInvocationCountDef.map((metric:(string|CloudWatchMetricImportProps)[])=>{
      const cloudWatchMetricProps =  metric[4] as CloudWatchMetricImportProps
      return new Metric({
        namespace: metric[0] as string,
        metricName: metric[1] as string,
        dimensionsMap : {
          [metric[2] as string]:metric[3] as string
        },
        period: Duration.seconds(cloudWatchMetricProps.period),
        label: cloudWatchMetricProps.label,
        statistic: cloudWatchMetricProps.stat,
        region: cloudWatchMetricProps.region
      })
    })
    const invocationCountWidget =new SingleValueWidget({
      // ...
      width: 12,
      height: 6,
      title: "Invocation Count",
      region: Stack.of(this).region,
      metrics: invocationCountMetrics,
      start: "-PT72H",
      sparkline: true
    });

    const inputTokenClaudeSonnet =  importedTokenMetricsDef.map((metric:(string|CloudWatchMetricImportProps)[])=>{
        const cloudWatchMetricProps =  metric[4] as CloudWatchMetricImportProps
        return new Metric({
          namespace: metric[0] as string,
          metricName: metric[1] as string,
          dimensionsMap : {
            [metric[2] as string]:metric[3] as string
          },
          period: Duration.seconds(cloudWatchMetricProps.period),
          label: cloudWatchMetricProps.label,
          statistic: cloudWatchMetricProps.stat,
          region: cloudWatchMetricProps.region
        })
    })
    const tokenCountWidget  = new SingleValueWidget({
      // ...
      width: 12,
      height: 6,
      title: "Token Counts by Model",
      region: Stack.of(this).region,
      metrics: inputTokenClaudeSonnet,
      start: "-PT72H",
      sparkline: true
    });

    dashboard.addWidgets(new Row(invocationCountWidget, tokenCountWidget))

    const invocationPerMinuteMetrics =  importedBedrockInvocationThroughputDef.map((metric:(string|CloudWatchMetricImportProps)[])=>{
      const cloudWatchMetricProps =  metric[4] as CloudWatchMetricImportProps
      return new Metric({
        namespace: metric[0] as string,
        metricName: metric[1] as string,
        dimensionsMap : {
          [metric[2] as string]:metric[3] as string
        },
        period: Duration.seconds(cloudWatchMetricProps.period),
        label: cloudWatchMetricProps.label,
        statistic: cloudWatchMetricProps.stat,
        region: cloudWatchMetricProps.region
      })
    })
    const invocationPerMinuteWidget = new SingleValueWidget({
      // ...
      width: 12,
      height: 6,
      title: "Invocation Per Minute",
      region: Stack.of(this).region,
      metrics: invocationPerMinuteMetrics,
      start: "-PT72H",
      sparkline: true
    });

    const invocationThrottle =  new Metric({
        namespace: "AWS/Bedrock",
        metricName: "InvocationThrottles",

        period: Duration.seconds(60),
        statistic: "Sum",
        region: Stack.of(this).region
      })

    const invocationThrottledWidget = new SingleValueWidget({
      // ...
      width: 12,
      height: 6,
      title: "Invocation Throttles",
      region: Stack.of(this).region,
      metrics: [invocationThrottle],
      start: "-PT72H",
      sparkline: true
    });

    dashboard.addWidgets(new Row(invocationPerMinuteWidget, invocationThrottledWidget))


    /*
      Lambda Based metric
     */

    const lambdaSectionWidget = new TextWidget({
      width: 24,
      height: 2,
      markdown: "\n\n## AWS Lambda"
    })
    dashboard.addWidgets(new Row(lambdaSectionWidget))
    const invokedLambdaMetrics = props.functionList.map((invokedLambda) => {
      return invokedLambda.metricInvocations({
        period: Duration.days(1),
        statistic: "Sum"
      })
    })

    const invokedLambdaWidget = new SingleValueWidget({
      // ...
      width: 12,
      height: 6,
      title: "Lambda Invocation",
      region: Stack.of(this).region,
      metrics: invokedLambdaMetrics,
      start: "-PT72H",
      sparkline: true
    });




    const durationLambdaMetrics = props.functionList.map((invokedLambda) => {
      return invokedLambda.metricDuration({
        period: Duration.seconds(60)
      })
    })

    const lambdaDurationWidget  = new GraphWidget({
      // ...
      width: 12,
      height: 6,
      title: "Lambda Duration",
      region: Stack.of(this).region,
      liveData: false,
      view: GraphWidgetView.TIME_SERIES,
      stacked: false,
      legendPosition: LegendPosition.RIGHT,
      right: durationLambdaMetrics
    })

    dashboard.addWidgets(new Row(invokedLambdaWidget,lambdaDurationWidget))

  }
}