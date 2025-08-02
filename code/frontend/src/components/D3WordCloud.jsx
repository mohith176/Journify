import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

const D3WordCloud = ({ words, width = 800, height = 400, colors }) => {
  const svgRef = useRef(null);
  
  const colorScale = d3.scaleOrdinal()
    .domain([0, words.length])
    .range(colors || ['#1e88e5', '#d81b60', '#00897b', '#ff8f00', '#020617']);

  useEffect(() => {
    if (!words || words.length === 0) return;
    
    // Clear previous word cloud
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Create the word cloud layout
    const layout = cloud()
      .size([width, height])
      .words(words.map(d => ({ 
        text: d.text, 
        size: 10 + (d.value * 1.8), // Scale the size based on value
        value: d.value 
      })))
      .padding(5)
      .rotate(() => Math.floor(Math.random() * 2) * 90)
      .font("sans-serif")
      .fontSize(d => d.size)
      .spiral("archimedean")
      .on("end", draw);
    
    // Generate the layout
    layout.start();
    
    // Draw the word cloud
    function draw(words) {
      d3.select(svgRef.current)
        .attr("width", layout.size()[0])
        .attr("height", layout.size()[1])
        .append("g")
        .attr("transform", `translate(${layout.size()[0] / 2},${layout.size()[1] / 2})`)
        .selectAll("text")
        .data(words)
        .enter()
        .append("text")
        .style("font-size", d => `${d.size}px`)
        .style("font-family", "sans-serif")
        .style("fill", (d, i) => colorScale(i))
        .attr("text-anchor", "middle")
        .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
        .text(d => d.text)
        .append("title")  // Add tooltip
        .text(d => `${d.text}: ${d.value}`);
    }
  }, [words, width, height, colorScale]);
  
  return (
    <svg ref={svgRef} width={width} height={height} />
  );
};

export default D3WordCloud;