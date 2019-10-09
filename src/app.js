import * as d3 from 'd3';
import d3Tip from "d3-tip";
import './app.css';
import $ from "jquery";
import { createApolloFetch } from 'apollo-fetch';



var metrics_values={};

function load_bars_visualization (){ 

  let charts = document.getElementsByClassName("benchmarkingChart");
  
  let i = 0;
  let dataId;
  let y;
  let divid;
  
  // append ids to chart/s and make d3 plot
  i = 0
  for(y of charts){
    // define base url - production or development
    //check for mode by default it is production if no param is given
    var mode = $(y).data("mode") ? "dev-openebench" : "openebench"
    let base_url = "https://" + mode + ".bsc.es/";

    // get benchmarking event id
    dataId = y.getAttribute('data-id');

    // get metric id
    var metric_y = y.getAttribute('metric_y');
    //set chart id
    divid = (dataId+i).replace(":","_");
    y.id=divid;
    
    let url = base_url + "sciapi/graphql";
        
    let json_query = `query getDatasets($challenge_id: String!){
                        getDatasets(datasetFilters:{challenge_id: $challenge_id, type:"assessment"}) {
                            _id
                            community_ids
                            datalink{
                                inline_data
                            }
                            depends_on{
                                tool_id
                                metrics_id
                            }
                        }
                      }`

  let table_id = divid + "_table";
  var input = $('<br><br><table id="'+table_id+ '"class="benchmarkingTable"></table>');
  $("#" + divid).append(input);

    get_data(url, json_query ,dataId, divid, metric_y);

  i++;
  };
};

function get_data(url, json_query ,dataId, divid, metric_y){

  try {

      const fetch = createApolloFetch({
        uri: url,
      });

      let vars = { challenge_id: dataId };

      fetch({
        query: json_query,
        variables: vars,
      }).then(res => {
          let result = res.data.getDatasets;
          if (result.length == 0){

            // document.getElementById(divid + "_button").remove();
      
            var para = document.createElement("td");
            para.id = "no_benchmark_data"
            var err_txt = document.createTextNode("No data available for the selected challenge: " + dataId);
            para.appendChild(err_txt);
            var element = document.getElementById(divid);
            element.appendChild(para);
      
        } else {

          // get the names of the tools that are present in the community
          const fetchData = () => fetch({
            query: `query getTools($community_id: String!){
                        getTools(toolFilters:{community_id: $community_id}) {
                            _id
                            name
                        }
                        getMetrics {
                          _id
                          title
                          representation_hints
                        }
                    }`,
            variables: {community_id: result[0].community_ids[0]},
          });

          fetchData().then(response => { 
            
            let tool_list = response.data.getTools;
            let metrics_list = response.data.getMetrics;
            // iterate over the list of tools to generate a dictionary
            let tool_names = {};
            tool_list.forEach( function(tool) {
                tool_names[tool._id] = tool.name
            
            });

            // iterate over the list of metrics to generate a dictionary
            let metric_name;

            metrics_list.forEach( function(element) {
              if (element._id == metric_y){
                metric_name = element.title
              } 
                            
            });
          
            join_all_json(result, divid, tool_names, metric_name);

          });
                              
        };
      });

    }
    catch (err) {
      console.log(`Invalid Url Error: ${err.stack} `);
    }

};

function join_all_json(result, divid, tool_names, metric_name){

  var data =[]
  result.forEach( function(dataset) {

    data.push({ 
      "toolname": tool_names[dataset.depends_on.tool_id],
      "metric_value": parseFloat(dataset.datalink.inline_data.value)
    });

  });

  // sort data by participant name
  data = sortByKey(data, "toolname");
  metrics_values[divid] = data;

  // add plot limits
  var margin = {top: 40, right: 30, bottom: 120, left: 60},
  width = Math.round($(window).width()* 0.70226) - margin.left - margin.right,
  height = Math.round($(window).height()* 0.8888) - margin.top - margin.bottom;

  // add button
  d3.select("#" + divid).append("input")
  .attr("type","button")
  .attr("class","classificator_button")
  .attr("id", divid + "_button")
  .attr("value", "Sort & Classify Results" )
  .on('click', function(d) { sort_and_classify(data, divid, width, margin, height, metric_name);})
  
  build_plot(data, divid, width, margin, height, metric_name);
};

function build_plot(data, divid, width, margin, height, metric_name){

    var formatPercent = d3.format(".0%");
  let formatComma = d3.format(",");
  let formatDecimal = d3.format(".4f");

    
  let min_y = d3.min(data, function(d) { return d.metric_value; });
  let max_y = d3.max(data, function(d) { return d.metric_value; });

  var x = d3.scaleBand()
  .range([0, width], .1)
  .domain(data.map(function(d) { return d.toolname; }))
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
  return "<b><strong>" + d.toolname + "</strong></b><br/><span style='color:red'>value: </span>" + formatComma(d.metric_value);
  })

  var svg = d3.select("#" + divid).append("svg")
  .attr("id", divid + "_svg")
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
      .text(metric_name); 

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
    .attr("x", function(d) { return x(d.toolname); })
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
  .attr("y", function(d) { return y(d.metric_value); })
  .attr("height", function(d) { return height - y(d.metric_value); })
  .delay(function(d,i){return(i*10)})
  
  
  // add_arrow("aaa", svg, x, y, "-", data)

};

function sort_and_classify(data, divid, width, margin, height, metric_name){

  // every time a new classification is compute the previous results table is deleted (if it exists)
  if (document.getElementById(divid + "_table") != null) {
    document.getElementById(divid + "_table").innerHTML = '';
  };
   // sort data
   let sorted_data = data.sort(function(b, a) {
    return a.metric_value - b.metric_value;
  });

  // delete previous plot and build new one
  d3.select('#'+ divid + '_svg').remove();
  build_plot(sorted_data, divid, width, margin, height, metric_name);

  let values = sorted_data.map(a => a.metric_value).sort(function(a, b){return a - b});

  let quantile_1 = d3.quantile(values, 0.25);
  let quantile_2 = d3.quantile(values, 0.5);
  let quantile_3 = d3.quantile(values, 0.75);

  // append lines to svg plot
  var lower_quantile_limit = draw_quartile_line(divid, quantile_3, sorted_data, 0, "1st Quartile", width, margin, height);
  lower_quantile_limit = draw_quartile_line(divid, quantile_2, sorted_data, lower_quantile_limit, "2nd Quartile", width, margin, height);
  lower_quantile_limit= draw_quartile_line(divid, quantile_1, sorted_data, lower_quantile_limit, "3rd Quartile", width, margin, height);

  // add last quartile
  var svg = d3.select("#" + divid + "_svg")
    svg.append("text")
    .attr("id", function (d) { return divid+"___num_bottom_right";})
    .attr("x", (width + lower_quantile_limit)/2 + margin.left  )
    .attr("y",margin.top + 30)
    .attr("text-anchor", "middle")
    .style("opacity", 0.4)
    .style("font-size", "2vw")
    .style("fill", "#0A58A2")
    .text("4th Quartile");

  // show results in table format
  transform_classif_to_table(divid, data, quantile_1, quantile_2, quantile_3);
  
};

function draw_quartile_line(divid, quantile, data, lower_quantile_limit, text, width, margin, height) {

    // find out which is the quartile limit
    let quantile_limit;
    for (var i = 0; i < data.length; i++) { 
      var participant = data[i];
      if (participant.metric_value < quantile) {
        quantile_limit = participant.toolname;
        break;
      }
    };

    ///
    var x = d3.scaleBand()
    .range([0,width], .1)
    .domain(data.map(function(d) { return d.toolname; }))
    .padding(0.4);
  
  
    var svg = d3.select("#" + divid + "_svg")
    // svg.append("line")
    // .attr("x1", x(quantile_limit) + x.step() /2 - x.bandwidth() /2 )
    // .attr("x2", x(quantile_limit) + x.step() /2 - x.bandwidth() /2 )
    // .attr("y1", 40)
    // .attr("y2", 480)
    // .attr("stroke", "#0A58A2")
    // .attr("stroke-width",2)
    // .style("stroke-dasharray", ("20, 5"))
    // .style("opacity", 0.4)

    svg.append("g")
       .attr("transform", "translate("+ (x(quantile_limit) + x.step()/2 - x.bandwidth()  + margin.left)+",0)")
       .append("line")
       .attr("y1", margin.top)
       .attr("y2", height + margin.top)
       .attr("stroke", "#0A58A2")
       .attr("stroke-width",2)
       .style("stroke-dasharray", ("20, 5"))
       .style("opacity", 0.4)


    svg.append("text")
    .attr("id", function (d) { return divid+"___num_bottom_right";})
    .attr("x", (x(quantile_limit) + lower_quantile_limit)/2 + margin.left  )
    .attr("y",margin.top + 30)
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
      if (participant.metric_value >= quantile_3) {
        participant["quartile"] = 1;

      } else if (participant.metric_value < quantile_3 && participant.metric_value >= quantile_2) {
        participant["quartile"] = 2;
      } else if (participant.metric_value < quantile_2 && participant.metric_value >= quantile_1) {
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

  // change table display
  table.style.display = "block"; 
  var row = table.insertRow(-1);
  row.insertCell(0).innerHTML = "<b>TOOL</b>";
  row.insertCell(1).innerHTML = "<b>QUARTILE</b>";

  data.forEach(function(element) {
    var row = table.insertRow(-1);
    row.insertCell(0).innerHTML = element.toolname;
    row.insertCell(1).innerHTML = element.quartile;
    
    // add id
    var my_cell = row.cells[0];
    my_cell.id = divid+"___cell"+element.toolname.replace(/[\. ()/-]/g, "_");


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


function sortByKey(array, key) {
  return array.sort(function(a, b) {
      var x = a[key]; var y = b[key];
      return ((x < y) ? -1 : ((x > y) ? 1 : 0)) * 1;
  });
};

function type(d) {
d.wpc_index = +d.wpc_index;
return d;
}

export {
  load_bars_visualization
};

load_bars_visualization();