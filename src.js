export {
  mapIds,
  dbNodeValues,
  dbEdgeValues,
  dbNodeToValueArray,
  dbNodeToDummyValue,
  dbEdgeToValueArray,
  dbEdgeToDummyValue,
  createRequest,
  isLocation,
  sameLocation,
  isNode,
  sameNode,
  isEdge,
  sameEdge,
  edgeResolves,
  isGraph,
  isDBNode,
  isDBEdge,
  edgeDBResolves,
  isDBGraph,
  isPOSTRequest,
};

export default {
  mapIds,
  dbNodeValues,
  dbEdgeValues,
  dbNodeToValueArray,
  dbNodeToDummyValue,
  dbEdgeToValueArray,
  dbEdgeToDummyValue,
  createRequest,
  isLocation,
  sameLocation,
  isNode,
  sameNode,
  isEdge,
  sameEdge,
  edgeResolves,
  isGraph,
  isDBNode,
  isDBEdge,
  edgeDBResolves,
  isDBGraph,
  isPOSTRequest,
};

const name = 'postgres-planar-graph'

/**
 * database parsers
 */
function mapIds(request, insertResponseRows) {
  const map = insertResponseRows.reduce((obj, row, i) => ({
    ...obj,
    [request.createNodes[i].tempId]: row.id
  }), {});
  return Object.keys(request).reduce((obj, k) => {
    if (k === 'createNodes') {
      return obj;
    } else if (['createEdges', 'updateEdges'].includes(k)) {
      return {
        ...obj,
        [k]: request[k].map(e => ({
          ...e,
          head: Number.isInteger(e.head) ? e.head : map[e.tempHead],
          tail: Number.isInteger(e.tail) ? e.tail : map[e.tempTail],
        })),
      };
    } else {
      return { ...obj, [k]: request[k] };
    }
  }, {});
}

function dbNodeValues(type) {
  return (type === 'INSERT') ? '(graph, x, y)' : '(id, graph, x, y)';
}

function dbNodeToValueArray(node) {
  const isInsert = !Number.isInteger(node.id);
  const x = Array.isArray(node.location) ? node.location[0] : null;
  const y = Array.isArray(node.location) ? node.location[1] : null;
  return isInsert ? [node.graph, x, y] : [node.id, node.graph, x, y];
}

function dbNodeToDummyValue(node, rowNum) {
  const isInsert = !Number.isInteger(node.id);
  const K = isInsert ? 3 * rowNum : 4 * rowNum;
  const k = isInsert ? 0 : 1;
  const b = isInsert ? '(' : `($${K+1}::INTEGER, `;
  return (
    Array.isArray(node.location)
    ? `${b}$${K+k+1}::INTEGER, $${K+k+2}::FLOAT, $${K+k+3}::FLOAT)`
    : `${b}$${K+k+1}::INTEGER, $${K+k+2}::NULL, $${K+k+3}::NULL)`
  )
}

function dbEdgeValues(type) {
  return (
    type === 'INSERT'
    ? '(graph, head, tail, index)' 
    : '(id, graph, head, tail, index)'
  );
}

function dbEdgeToValueArray(edge) {
  const isInsert = !Number.isInteger(edge.id);
  const index = Number.isInteger(edge.index) ? edge.index : null;
  return (
    isInsert
    ? [edge.graph, edge.head, edge.tail, index]
    : [edge.id, edge.graph, edge.head, edge.tail, index]
  );
}

function dbEdgeToDummyValue(edge, rowNum) {
  const isInsert = !Number.isInteger(edge.id);
  const K = isInsert ? 4 * rowNum : 5 * rowNum;
  const k = isInsert ? 0 : 1;
  const b = isInsert ? '(' : `($${K+1}::INTEGER, `;
  const I = 'INTEGER'
  return (
    Number.isInteger(edge.index)
    ? `${b}$${K+k+1}::${I}, $${K+k+2}::${I}, $${K+k+3}::${I}, $${K+k+4}::${I})`
    : `${b}$${K+k+1}::${I}, $${K+k+2}::${I}, $${K+k+3}::${I}, $${K+k+4}::NULL)`
  );
}

/**
 * createRequest
 */
function createRequest(oldGraph, graph, tol) {
  // assert these are in fact graphs
  if (
    !isDBGraph(oldGraph) 
    || !isGraph(graph) 
    || oldGraph.id !== graph.id
    || (tol && !Number.isFinite(tol))
  ) {
    throw new TypeError(`${name}: see README for 'createRequest signature`);
  }

  // we will repeatedly assign different objects to the alias obj
  let obj = {
    createNodes: [],
    updateNodes: [],
    deleteNodes: [],
    createEdges: [],
    updateEdges: [],
    deleteEdges: [],
  };

  // create/update nodes
  obj = graph.nodes.reduce((obj, node) => {
    // if there is no id, it immediately goes to createNodes
    if (typeof node.id === 'undefined') {
      return { ...obj, createNodes: [...obj.createNodes, node] };
    }

    // find the node that matches
    const match = oldGraph.nodes.find(({ id }) => id === node.id);

    // if no node matches, we do not consider this alledged database node
    if (!match) return obj;

    // lastly, we check if they are the same to see if we add updates
    return (
      sameNode(node, match, tol) 
      ? obj 
      : { ...obj, updateNodes: [...obj.updateNodes, node] }
    );
  }, obj);

  // delete nodes
  obj = oldGraph.nodes.reduce((obj, node) => (
    // if the id is in updateNodes, it has not been deleted
    graph.nodes.some(({ id }) => id === node.id)
    ? obj
    : { ...obj, deleteNodes: [...obj.deleteNodes, node.id] }
  ), obj);

  // create/update edges
  obj = graph.edges.reduce((obj, edge) => {
    // if there is no id, it immediately goes to createEdges
    if (typeof edge.id === 'undefined') {
      return { ...obj, createEdges: [...obj.createEdges, edge] };
    }

    // find the edge that matches
    const match = oldGraph.edges.find(({ id }) => id === edge.id);

    // if no edge matches, we do not consider this alledged database edge
    if (!match) return obj;

    // lastly, we check if they are the same to see if we add updates
    return (
      sameEdge(edge, match) 
      ? obj 
      : { ...obj, updateEdges: [...obj.updateEdges, edge] }
    );
  }, obj);

  // delete edges
  obj = oldGraph.edges.reduce((obj, edge) => (
    // if the id is in updateEdges it has not been deleted
    graph.edges.some(({ id }) => id === edge.id)
    ? obj
    : { ...obj, deleteEdges: [...obj.deleteEdges, edge.id] }
  ), obj);

  // return the object at the end of all of this
  return obj;
}

/**
 * types
 */

function isLocation(location) {
  return (
    Array.isArray(location) 
    && location.length === 2 
    && location.every(Number.isFinite)
  )
}

function sameLocation(loc1, loc2, tol) {
  if (typeof tol === 'undefined') { tol = 1e-5; }
  return (
    (!loc1 && !loc2)
    || (loc1 && loc2 && [0,1].every(i => Math.abs(loc1[i] - loc2[i]) < tol))
  );
}

function isNode(node) {
  return (
    typeof node === 'object'
    && Number.isInteger(node.graph)
    && (Number.isInteger(node.id) ? typeof node.tempId === 'undefined' : Number.isInteger(node.tempId))
    && (!node.location || isLocation(node.location))
  );
}

function sameNode(node1, node2, tol) {
  return (
    ['id', 'tempId', 'graph'].every(k => node1[k] === node2[k])
    && sameLocation(node1.location, node2.location, tol)
  ) || false;
}

function isEdge(edge) {
  return (
    typeof edge === 'object'
    && Number.isInteger(edge.graph)
    && (Number.isInteger(edge.head) ? typeof edge.tempHead === 'undefined' : Number.isInteger(edge.tempHead))
    && (Number.isInteger(edge.tail) ? typeof edge.tempTail === 'undefined' : Number.isInteger(edge.tempTail))
    && (typeof edge.index === 'undefined' || Number.isInteger(edge.index))
  );
}

function sameEdge(edge1, edge2) {
  return (
    ['id', 'graph', 'head', 'tail', 'tempHead', 'tempTail', 'index']
    .every(k => edge1[k] === edge2[k])
  );
}


function isHead(node, edge) {
  return (
    (Number.isInteger(node.id) && node.id === edge.head)
    || (Number.isInteger(node.tempId) && node.tempId === edge.tempHead)
  );
}

function isTail(node, edge) {
  return (
    (Number.isInteger(node.id) && node.id === edge.tail)
    || (Number.isInteger(node.tempId) && node.tempId === edge.tempTail)
  );
}

function edgeResolves(edge, nodes) {
  return nodes.reduce((acc, node) => (
    (isHead(node, edge) || isTail(node, edge))
    ? acc + 1
    : acc
  ), 0) == 2;
}

function isGraph(graph) {
  return (
    typeof graph === 'object'
    && Number.isInteger(graph.id)
    && Array.isArray(graph.nodes)
    && graph.nodes.every(n => isNode(n) && n.graph === graph.id)
    && Array.isArray(graph.edges)
    && graph.edges.every(e => (
      isEdge(e) && e.graph === graph.id && edgeResolves(e, graph.nodes)
    ))
  );
}

function isDBNode(node) {
  return (
    typeof node === 'object'
    && Number.isInteger(node.graph)
    && Number.isInteger(node.id)
    && typeof node.tempId === 'undefined'
    && (!node.location || isLocation(node.location))
  );
}

function isDBEdge(edge) {
  return (
    typeof edge === 'object'
    && Number.isInteger(edge.id)
    && Number.isInteger(edge.graph)
    && Number.isInteger(edge.head)
    && typeof edge.tempHead === 'undefined'
    && Number.isInteger(edge.tail)
    && typeof edge.tempTail === 'undefined'
    && (typeof edge.index === 'undefined' || Number.isInteger(edge.index))
  );
}

function isDBHead(node, edge) {
  return Number.isInteger(node.id) && node.id === edge.head;
}

function isDBTail(node, edge) {
  return Number.isInteger(node.id) && node.id === edge.tail;
}

function edgeDBResolves(edge, nodes) {
  return nodes.reduce((acc, node) => (
    (isDBHead(node, edge) || isDBTail(node, edge))
    ? acc + 1
    : acc
  ), 0) == 2;
}

function isDBGraph(graph) {
  return (
    typeof graph === 'object'
    && Number.isInteger(graph.id)
    && Array.isArray(graph.nodes)
    && graph.nodes.every(n => isDBNode(n) && n.graph === graph.id)
    && Array.isArray(graph.edges)
    && graph.edges.every(e => (
      isDBEdge(e) && e.graph === graph.id && edgeDBResolves(e, graph.nodes)
    ))
  );
}

function isPOSTRequest(request) {
  const CRUD = ['create', 'update', 'delete'];
  const keys = CRUD.reduce((a, op) => [...a, `${op}Nodes`, `${op}Edges`], []);
  return (
    typeof request === 'object'
    && keys.every(k => !request[k] || Array.isArray(request[k]))
    && (!request.createNodes || request.createNodes.every(n => isNode(n) && typeof n.id === 'undefined'))
    && (!request.updateNodes || request.updateNodes.every(isDBNode))
    && (!request.deleteNodes || request.deleteNodes.every(Number.isInteger))
    && (!request.createEdges || request.createEdges.every(isEdge))
    && (!request.updateEdges || request.updateEdges.every(e => isEdge(e) && Number.isInteger(e.id)))
    && (!request.deleteEdges || request.deleteEdges.every(Number.isInteger))
  );
}
