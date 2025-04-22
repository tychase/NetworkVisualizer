import * as d3 from 'd3';

// Types for Force Directed Graph
export interface Node {
  id: string;
  name: string;
  type: 'politician' | 'organization';
  group: string; // party for politicians, industry for organizations
  amount?: number;
  image?: string;
}

export interface Link {
  source: string;
  target: string;
  value: number;
  type: 'contribution' | 'conflict';
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}

// Function to create a force directed graph
export function createForceDirectedGraph(
  element: HTMLElement,
  data: GraphData,
  width: number,
  height: number,
  onNodeClick: (node: Node) => void
) {
  // Clear any existing svg
  d3.select(element).selectAll("*").remove();
  
  const svg = d3.select(element)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);

  // Color scales
  const nodeColorScale = d3.scaleOrdinal<string>()
    .domain(['Democrat', 'Republican', 'Independent', 'Technology', 'Healthcare', 'Energy', 'Finance', 'Defense', 'Education'])
    .range(['#3B82F6', '#EF4444', '#10B981', '#6366F1', '#EC4899', '#F59E0B', '#8B5CF6', '#64748B', '#14B8A6']);

  const linkColorScale = d3.scaleOrdinal<string>()
    .domain(['contribution', 'conflict'])
    .range(['#F59E0B', '#EF4444']);

  // Create the simulation with forces
  const simulation = d3.forceSimulation(data.nodes as d3.SimulationNodeDatum[])
    .force("link", d3.forceLink<d3.SimulationNodeDatum, d3.SimulationLinkDatum<d3.SimulationNodeDatum>>(data.links)
      .id(d => (d as Node).id)
      .distance(100))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2));

  // Create the link elements
  const link = svg.append("g")
    .attr("stroke-opacity", 0.6)
    .selectAll("line")
    .data(data.links)
    .join("line")
    .attr("stroke", d => linkColorScale(d.type))
    .attr("stroke-width", d => Math.sqrt(d.value) / 10);

  // Create the node elements
  const node = svg.append("g")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .selectAll("circle")
    .data(data.nodes)
    .join("circle")
    .attr("r", d => d.type === 'politician' ? 15 : 10)
    .attr("fill", d => nodeColorScale(d.group))
    .call(drag(simulation));

  // Add tooltips
  node.append("title")
    .text(d => d.name);

  // Handle node clicks
  node.on("click", (event, d) => {
    onNodeClick(d);
  });

  // Add text labels
  const labels = svg.append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .selectAll("text")
    .data(data.nodes)
    .join("text")
    .attr("dx", 12)
    .attr("dy", ".35em")
    .text(d => d.name);

  // Update positions on simulation tick
  simulation.on("tick", () => {
    link
      .attr("x1", d => (d.source as any).x)
      .attr("y1", d => (d.source as any).y)
      .attr("x2", d => (d.target as any).x)
      .attr("y2", d => (d.target as any).y);

    node
      .attr("cx", d => d.x!)
      .attr("cy", d => d.y!);
      
    labels
      .attr("x", d => d.x!)
      .attr("y", d => d.y!);
  });

  // Dragging behavior
  function drag(simulation: d3.Simulation<d3.SimulationNodeDatum, undefined>) {
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    return d3.drag<SVGCircleElement, Node>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  return simulation;
}

// Function to create a horizontal bar chart
export function createHorizontalBarChart(
  element: HTMLElement,
  data: { name: string; value: number }[],
  width: number,
  height: number,
  margin = { top: 30, right: 40, bottom: 30, left: 120 }
) {
  // Clear any existing svg
  d3.select(element).selectAll("*").remove();
  
  // Sort data by value in descending order
  data = [...data].sort((a, b) => b.value - a.value);
  
  const svg = d3.select(element)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);
  
  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value) || 0])
    .range([margin.left, width - margin.right]);
  
  const y = d3.scaleBand()
    .domain(data.map(d => d.name))
    .range([margin.top, height - margin.bottom])
    .padding(0.1);
  
  // X axis
  svg.append("g")
    .attr("transform", `translate(0,${margin.top})`)
    .call(d3.axisTop(x).ticks(5).tickFormat(d => d3.format("$,.0f")(+d)))
    .call(g => g.select(".domain").remove());
  
  // Y axis
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickSize(0))
    .call(g => g.select(".domain").remove());
  
  // Bars
  svg.append("g")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", margin.left)
    .attr("y", d => y(d.name) || 0)
    .attr("width", d => x(d.value) - margin.left)
    .attr("height", y.bandwidth())
    .attr("fill", "#3B82F6");
  
  // Values at end of bars
  svg.append("g")
    .attr("fill", "black")
    .attr("text-anchor", "end")
    .attr("font-size", 10)
    .selectAll("text")
    .data(data)
    .join("text")
    .attr("x", d => x(d.value) + 4)
    .attr("y", d => (y(d.name) || 0) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .text(d => d3.format("$,.0f")(d.value));
}

// Function to create a timeline visualization
export function createTimelineVisualization(
  element: HTMLElement,
  data: {
    id: number;
    date: Date;
    type: 'vote' | 'transaction';
    description: string;
    politician: string;
    amount?: number;
    tradeType?: 'BUY' | 'SELL';
    billName?: string;
    potentialConflict?: boolean;
  }[],
  width: number,
  height: number,
  margin = { top: 50, right: 50, bottom: 50, left: 50 }
) {
  // Clear any existing svg
  d3.select(element).selectAll("*").remove();
  
  const svg = d3.select(element)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);
    
  // Sort data by date
  data = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Set up scales
  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.date) as [Date, Date])
    .range([margin.left, width - margin.right]);
  
  const y = d3.scalePoint()
    .domain(Array.from(new Set(data.map(d => d.politician))))
    .range([margin.top, height - margin.bottom])
    .padding(0.5);
  
  // Add X axis
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));
  
  // Add Y axis
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));
  
  // Color scale for event types
  const colorScale = d3.scaleOrdinal<string>()
    .domain(['vote', 'transaction'])
    .range(['#3B82F6', '#F59E0B']);
  
  // Add grid lines
  svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3.axisBottom(x)
        .tickSize(-(height - margin.top - margin.bottom))
        .tickFormat(() => '')
    );
  
  // Add events as circles
  svg.selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => x(d.date))
    .attr("cy", d => y(d.politician) || 0)
    .attr("r", d => d.potentialConflict ? 8 : 5)
    .attr("fill", d => d.potentialConflict ? "#EF4444" : colorScale(d.type))
    .attr("stroke", d => d.potentialConflict ? "#991B1B" : "none")
    .attr("stroke-width", 2)
    .append("title")
    .text(d => {
      let tooltip = `${d.politician}: ${d.description} (${d.date.toLocaleDateString()})`;
      if (d.type === 'transaction') {
        tooltip += `\nAmount: $${d.amount?.toLocaleString()}`;
        tooltip += `\nType: ${d.tradeType}`;
      }
      if (d.billName) {
        tooltip += `\nRelated Bill: ${d.billName}`;
      }
      if (d.potentialConflict) {
        tooltip += "\n⚠️ Potential Conflict of Interest";
      }
      return tooltip;
    });
  
  // Add connecting lines for each politician
  const politicians = Array.from(new Set(data.map(d => d.politician)));
  
  politicians.forEach(politician => {
    const politicianData = data.filter(d => d.politician === politician);
    
    if (politicianData.length > 1) {
      const line = d3.line<typeof data[0]>()
        .x(d => x(d.date))
        .y(d => y(d.politician) || 0);
      
      svg.append("path")
        .datum(politicianData)
        .attr("fill", "none")
        .attr("stroke", "#CBD5E1")
        .attr("stroke-width", 1)
        .attr("d", line);
    }
  });
  
  // Add legend
  const legend = svg.append("g")
    .attr("transform", `translate(${width - margin.right - 100}, ${margin.top})`);
  
  const legendData = [
    { type: "vote", label: "Vote" },
    { type: "transaction", label: "Stock Transaction" },
    { type: "conflict", label: "Potential Conflict" }
  ];
  
  legendData.forEach((d, i) => {
    const g = legend.append("g")
      .attr("transform", `translate(0, ${i * 20})`);
    
    g.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 5)
      .attr("fill", d.type === "conflict" ? "#EF4444" : colorScale(d.type as 'vote' | 'transaction'));
    
    g.append("text")
      .attr("x", 10)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .attr("font-size", 10)
      .text(d.label);
  });
}
