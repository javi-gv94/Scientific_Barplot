import * as d3 from 'd3';
import d3Tip from "d3-tip";
import './app.css';

var margin = {top: 40, right: 20, bottom: 60, left: 60},
width = 960 - margin.left - margin.right,
height = 600 - margin.top - margin.bottom;

var formatPercent = d3.format(".0%");

d3.tsv("drug_sensitivity.tsv").then (function ( data) {

   // sort data
  //  data.sort(function(b, a) {
  //   return a.frequency - b.frequency;
  // });

  let min_y = d3.min(data, function(d) { return d.frequency; });
  let max_y = d3.max(data, function(d) { return d.frequency; });

  var x = d3.scaleBand()
  .range([0, width], .1)
  .domain(data.map(function(d) { return d.letter; }))
  .padding(0.2);

  var y = d3.scaleLinear()
  .domain([min_y, max_y]).nice()
  .range([height, 0]);

 
  var xAxis = d3.axisBottom(x);

  var yAxis = d3.axisLeft(y).ticks(5);
  // .tickFormat(formatPercent);

  var tip = d3Tip();
  tip.attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function(d) {
  return "<strong>WPC-index:</strong> <span style='color:red'>" + d.frequency + "</span>";
  })

  var svg = d3.select("body").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.call(tip);

  //add axis labels
  svg.append("text")             
  .attr("transform",
            "translate(" + (width/2) + " ," + 
                           (height + margin.top + 10) + ")")
  .style("text-anchor", "middle")
  .style("font-weight", "bold")
  .style("font-size", ".75vw")
  .text("TOOLS");

  svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x",0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-weight", "bold")
      .style("font-size", ".75vw")
      .text("WPC-index"); 

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", "-.55em")
    .attr("transform", "rotate(-90)" );

  svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)
  .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("Frequency");

  svg.selectAll(".bar")
    .data(data)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", function(d) { return x(d.letter); })
    .attr("width", x.bandwidth())
    .attr("y", function(d) { return y(d.frequency); })
    .attr("height", function(d) { return height - y(d.frequency); })
    .on('mouseover', tip.show)
    .on('mouseout', tip.hide)

});

function type(d) {
d.frequency = +d.frequency;
return d;
}