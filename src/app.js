import * as d3 from 'd3';
import d3Tip from "d3-tip";
import './app.css';
import $ from "jquery";



var metrics_values={};

d3.csv("drug_sensitivity.csv").then (function(data) { 

  metrics_values["OEB"] = data;

  // add button
  d3.select("#OEB").append("input")
    .attr("type","button")
    .attr("class","button")
    .attr("value", "Sort & Classify Results" )
    .on('click', function(d) { sort_and_classify(data);})

  build_plot(data)

  let table_id = "OEB_table";
  var input = $('<br><br><table id="'+table_id+ '"class="benchmarkingTable"></table>');
  $("#OEB").append(input);
});

function build_plot(data){

  var margin = {top: 40, right: 20, bottom: 120, left: 60},
  width = Math.round($(window).width()* 0.70226) - margin.left - margin.right,
  height = Math.round($(window).height()* 0.8888) - margin.top - margin.bottom;

  var formatPercent = d3.format(".0%");
  let formatComma = d3.format(",");
  let formatDecimal = d3.format(".4f");

    
  let min_y = d3.min(data, function(d) { return d.wpc_index; });
  let max_y = d3.max(data, function(d) { return d.wpc_index; });

  var x = d3.scaleBand()
  .range([0, width], .1)
  .domain(data.map(function(d) { return d.Method; }))
  .padding(0.4);

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
  return "<b><strong>" + d.Method + "</strong></b><br/><span style='color:red'>wpc-index: </span>" + formatComma(d.wpc_index);
  })

  var svg = d3.select("#OEB").append("svg")
  .attr("id", "OEB_svg")
  .attr("class", "benchmarkingSVG")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.call(tip);

  //add axis labels
  svg.append("text")             
  .attr("transform",
            "translate(" + (width/2) + " ," + 
                           (height + margin.top + 80) + ")")
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
      .text("wpc_index"); 

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", "-.55em")
    .attr("transform", "rotate(-60)" );

  svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)
  .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("wpc_index");

  svg.selectAll(".bar")
    .data(data)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", function(d) { return x(d.Method); })
    .attr("width", x.bandwidth())
    // no bar at the beginning thus:
    .attr("height", function(d) { return height - y(0); }) // always equal to 0
    .attr("y", function(d) { return y(0); })
    .on('mouseover', tip.show)
    .on('mouseout', tip.hide)

  // Animation
  svg.selectAll("rect")
  .transition()
  .duration(1000)
  .attr("y", function(d) { return y(d.wpc_index); })
  .attr("height", function(d) { return height - y(d.wpc_index); })
  .delay(function(d,i){return(i*10)})
  
  
  // add_arrow("aaa", svg, x, y, "-", data)

};

function sort_and_classify(data){

  let divid = "OEB";
  // every time a new classification is compute the previous results table is deleted (if it exists)
  if (document.getElementById(divid + "_table") != null) {
    document.getElementById(divid + "_table").innerHTML = '';
  };
   // sort data
   let sorted_data = data.sort(function(b, a) {
    return a.wpc_index - b.wpc_index;
  });

  // delete previous plot and build new one
  d3.select('#'+ divid + '_svg').remove();
  build_plot(sorted_data);

  let values = sorted_data.map(a => a.wpc_index).sort(function(a, b){return a - b});

  let quantile_1 = d3.quantile(values, 0.25);
  let quantile_2 = d3.quantile(values, 0.5);
  let quantile_3 = d3.quantile(values, 0.75);

  // append lines to svg plot
  var lower_quantile_limit = draw_quartile_line(divid, quantile_3, sorted_data, 0, "1st Quartile");
  lower_quantile_limit = draw_quartile_line(divid, quantile_2, sorted_data, lower_quantile_limit, "2nd Quartile");
  lower_quantile_limit= draw_quartile_line(divid, quantile_1, sorted_data, lower_quantile_limit, "3rd Quartile");

  // add last quartile
  var svg = d3.select("#" + divid + "_svg")
    svg.append("text")
    .attr("id", function (d) { return divid+"___num_bottom_right";})
    .attr("x", (860 + lower_quantile_limit)/2 + 62  )
    .attr("y",60)
    .attr("text-anchor", "middle")
    .style("opacity", 0.4)
    .style("font-size", "2vw")
    .style("fill", "#0A58A2")
    .text("4th Quartile");

  // show results in table format
  transform_classif_to_table(divid, data, quantile_1, quantile_2, quantile_3);
  
};

function draw_quartile_line(divid, quantile, data, lower_quantile_limit, text) {

    // find out which is the quartile limit
    let quantile_limit;
    for (var i = 0; i < data.length; i++) { 
      var participant = data[i];
      if (participant.wpc_index < quantile) {
        quantile_limit = participant.Method;
        break;
      }
    };
    ///
    var x = d3.scaleBand()
    .range([0, 880], .1)
    .domain(data.map(function(d) { return d.Method; }))
    .padding(0.4);
  
  
    var svg = d3.select("#" + divid + "_svg")
    svg.append("line")
    .attr("x1", x(quantile_limit) + 62 - x.step() / 2 + x.bandwidth() / 2)
    .attr("x2", x(quantile_limit) + 62 - x.step() / 2 + x.bandwidth() / 2)
    .attr("y1", 40)
    .attr("y2", 480)
    .attr("stroke", "#0A58A2")
    .attr("stroke-width",2)
    .style("stroke-dasharray", ("20, 5"))
    .style("opacity", 0.4)


    svg.append("text")
    .attr("id", function (d) { return divid+"___num_bottom_right";})
    .attr("x", (x(quantile_limit) + lower_quantile_limit)/2 + 60  )
    .attr("y",60)
    .attr("text-anchor", "middle")
    .style("opacity", 0.4)
    .style("font-size", "2vw")
    .style("fill", "#0A58A2")
    .text(text);

    return x(quantile_limit);
};

function transform_classif_to_table(divid, data, quantile_1, quantile_2, quantile_3){

    
    // split participants according to quartiles
    for (var i = 0; i < data.length; i++) { 
      var participant = data[i];
      if (participant.wpc_index >= quantile_3) {
        participant["quartile"] = 1;

      } else if (participant.wpc_index < quantile_3 && participant.wpc_index >= quantile_2) {
        participant["quartile"] = 2;
      } else if (participant.wpc_index < quantile_2 && participant.wpc_index >= quantile_1) {
        participant["quartile"] = 3;
      } else {
        participant["quartile"] = 4;
      };
    };

    fill_in_table(divid, data);
    set_cell_colors(divid);

};

function fill_in_table (divid, data){

  //create table dinamically
  var table = document.getElementById(divid + "_table");
  var row = table.insertRow(-1);
  row.insertCell(0).innerHTML = "<b>TOOL</b>";
  row.insertCell(1).innerHTML = "<b>QUARTILE</b>";

  data.forEach(function(element) {
    var row = table.insertRow(-1);
    row.insertCell(0).innerHTML = element.Method;
    row.insertCell(1).innerHTML = element.quartile;
    
    // add id
    var my_cell = row.cells[0];
    my_cell.id = divid+"___cell"+element.Method.replace(/[\. ()/-]/g, "_");


  });

};

function set_cell_colors(divid){

  var cell = $("#" + divid + "_table td"); 

  cell.each(function() { //loop through all td elements ie the cells

    var cell_value = $(this).html(); //get the value
    if (cell_value == 1) { //if then for if value is 1
      $(this).css({'background' : '#238b45'});   // changes td to red.
    } else if (cell_value == 2) {
      $(this).css({'background' : '#74c476'}); 
    } else if (cell_value == 3) {
      $(this).css({'background' : '#bae4b3'}); 
    } else if (cell_value == 4) {
      $(this).css({'background' : '#edf8e9'}); 
    } else if (cell_value == "--") {
      $(this).css({'background' : '#f0f0f5'}); 
    } else {
      $(this).css({'background' : '#FFFFFF'});
    };

  });

};

// function add_arrow(divid, svg, xScale, yScale, better, data){

//   // append optimization arrow
  
//   svg.append("svg:defs").append("svg:marker")
//   .attr("id", "opt_triangle")
//   .attr("class", function (d) { return divid+"___better_annotation";})
//   .attr("refX", 6)
//   .attr("refY", 6)
//   .attr("markerWidth", 30)
//   .attr("markerHeight", 30)
//   .attr("markerUnits","userSpaceOnUse")
//   .attr("orient", "auto")
//   .append("path")
//   .attr("d", "M 0 0 12 6 0 12 3 6")
//   .style("fill", "black")
//   .style("opacity", 0.7);

//   let x_axis = xScale.range();
//   let y_axis = yScale.domain();

// //   var line = svg.data(data)
// //   .enter().append("line")
// //   .attr("class", function (d) { return divid+"___better_annotation";})
// //   .attr("x1", function (d) {
// //     return xScale(d.Method) + xScale.rangeBand()/2;
// // })
// // .attr("x2", function (d) {
// //     return xScale(d.Method) + xScale.rangeBand()/2;
// // })
// // .attr("y1", function (d) {
// //     return yScale(d.wpc_index) ;
// // })
// // .attr("y2", function (d) {
// //     return yScale(d.wpc_index) ;
// // })
// //   .attr("stroke","black")  
// //   .attr("stroke-width",2)  
// //   .attr("marker-end","url(#opt_triangle)")
// //   .style("opacity", 0.4);  

//   svg.data(data)
//   .enter().append("text")
//   .attr("class", function (d) { return divid+"___better_annotation";})
//   .attr("x", function (d) {
//     return  xScale.rangeBand()/2;
// }).attr("y", function (d) {
//     return yScale(0.58) ;
// })
//   .style("opacity", 0.4)
//   .style("font-size", "7vw")
//   .text("better");

// };


function type(d) {
d.wpc_index = +d.wpc_index;
return d;
}