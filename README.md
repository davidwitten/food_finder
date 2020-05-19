# food_finder
This is a practice repository to help me learn Node + express. 


The most complete branch is OpenCensus. So, checkout the head of the "census" branch:
```
git clone https://github.com/davidwitten/food_finder.git
git checkout b50883b9393426da9905c32ce9e4a16e8aa6deb9
```

## Potential issue
In order to install @opencensus/node-js, you have to have node version 10.x.
If you have a version above that, you should checkout the master branch, which uses OpenTelemetry.

## Other branches
- Master: OpenTelemetry. Tracing implemented + monotonic counter
- Stackdriver: Same as census branch except it works with Stackdriver rather than Prometheus/Jaeger.


# How to run Census/Master

## Install Prometheus
See here: https://github.com/open-telemetry/opentelemetry-js/tree/master/examples/prometheus

## Install Jaeger
See here: https://github.com/open-telemetry/opentelemetry-js/tree/master/packages/opentelemetry-exporter-jaeger

```
npm install
npm start
```
