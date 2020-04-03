/**
 * necessary modules
 */
const { expect } = require('chai');
const db = require('./db');
const { 
  isLocation,
  sameLocation,
  isNode,
  isDBNode,
  sameNode,
  isEdge,
  isDBEdge,
  sameEdge,
  edgeResolves,
  edgeDBResolves,
  isGraph,
  isDBGraph,
  isPOSTRequest,
  createRequest,
  dbNodeValues,
  dbEdgeValues,
  dbNodeToValueArray,
  dbNodeToDummyValue,
  dbEdgeToValueArray,
  dbEdgeToDummyValue,
  dbNodesToCreate,
  mapIds,
} = require('../index');

/**
 * create our tester
 */
describe('postgres-planar-graph', () => {
  // generate some fake data
  const dbGraph = {
    id: 0,
    nodes: [
      { id: 0, graph: 0, location: [4.20, 6.66] },
      { id: 1, graph: 0, location: [.420, 66.6] },
      { id: 2, graph: 0, location: [420, 666.] },
      { id: 3, graph: 0, location: [42.0, .666] },
      { id: 4, graph: 0 },
      { id: 5, graph: 0 },
    ],
    edges: [
      { id: 0, graph: 0, head: 0, tail: 5 },
      { id: 1, graph: 0, head: 1, tail: 2 },
      { id: 2, graph: 0, head: 1, tail: 0 },
      { id: 3, graph: 0, head: 2, tail: 5 },
      { id: 4, graph: 0, head: 2, tail: 0 },
      { id: 5, graph: 0, head: 4, tail: 3 },
      { id: 6, graph: 0, head: 5, tail: 3 },
      { id: 7, graph: 0, head: 5, tail: 1 },
    ],
  }
  const graph = {
    id: 0,
    nodes: [
      { id: 0, graph: 0, location: [4.20, 6.6600000001] },
      { id: 1, graph: 0, location: [.6969, 66.6] },
      { id: 2, graph: 0, location: [420, 666.] },
      { id: 4, graph: 0, location: [6.969, 6.66] },
      { id: 5, graph: 0, location: [66.6, 6.66] },
      { tempId: 0, graph: 0, location: [66.6, 6.66] },
      { tempId: 1, graph: 0, location: [.666, 69] },
    ],
    edges: [
      { id: 0, graph: 0, head: 0, tail: 5 },
      { id: 1, graph: 0, head: 1, tail: 2 },
      { id: 2, graph: 0, tempHead: 1, tail: 0 },
      { id: 4, graph: 0, head: 2, tail: 0 },
      { id: 5, graph: 0, tempHead: 0, tempTail: 1 },
      { id: 7, graph: 0, head: 5, tail: 2 },
      { graph: 0, head: 5, tail: 2 },
      { graph: 0, head: 1, tail: 5 },
    ],
  }
  describe('types', () => {
    it('should detect if location type works', testLocationType);
    it('should detect if node types work', testNodeTypes);
    it('should detect if edge types work', testEdgeTypes);
    it('should detect if edge resolvers work', testEdgeResolvers);
    it('should detect if graph types work', testGraphTypes(dbGraph, graph));
    it('should detect if POST request type works', testPOSTRequestType);
  });
  describe('createRequest', () => {
    it('should parse graph differences', testCreateRequest(dbGraph, graph));
  });
  describe('dbParsers', () => {
    it('should parse the POST request to postgres API', testDBParsers);
    it('should resolve tempKeys to match insert', testMapIds);
  });
});

/**
 * our tests
 */
function testLocationType() {
  expect(isLocation([0.1, 0.2])).to.be.true;
  expect(isLocation([0.1, 0.2, 0.9])).to.be.false;
  expect(isLocation(0.5)).to.be.false;
  expect(isLocation([0.5])).to.be.false;
  expect(isLocation([0.5, 'h'])).to.be.false;
  expect(isLocation([0.5, undefined])).to.be.false;
  expect(sameLocation([0.1, 0.2], [0.1000001, 0.200002])).to.be.true;
  expect(sameLocation([0.1, 0.2], [0.1000001, 0.200002], 1e-14)).to.be.false;
}

function testNodeTypes() {
  expect(isNode({ id: 0, graph: 1 })).to.be.true;
  expect(isNode({ tempId: 0, graph: 1 })).to.be.true;
  expect(isNode({ tempId: 0, graph: 1, location: [0.1, 5] })).to.be.true;
  expect(isNode({ id: 0, graph: 1, location: [0.1, 5] })).to.be.true;
  expect(isNode({ tempId: 0, graph: 1, location: [0.1, 'a'] })).to.be.false;
  expect(isNode({ id: 0, graph: 1, location: 'a' })).to.be.false;
  expect(isDBNode({ id: 0, graph: 1 })).to.be.true;
  expect(isDBNode({ tempId: 0, graph: 1 })).to.be.false;
  expect(isDBNode({ tempId: 0, graph: 1, location: [0.1, 5] })).to.be.false;
  expect(isDBNode({ id: 0, graph: 1, location: [0.1, 5] })).to.be.true;
  expect(isDBNode({ tempId: 0, graph: 1, location: [0.1, 'a'] })).to.be.false;
  expect(isDBNode({ id: 0, graph: 1, location: 'a' })).to.be.false;
  expect(sameNode(
    { id: 0, graph: 1, location: [0.1,0.2] },
    { id: 0, graph: 1, location: [0.100000001, 0.20000000001] }
  )).to.be.true;
  expect(sameNode(
    { id: 0, tempId: 5, graph: 1, location: [0.1,0.2] },
    { id: 0, graph: 1, location: [0.100000001, 0.20000000001] }
  )).to.be.false;
}

function testEdgeTypes() {
  expect(isEdge({ id: 0, graph: 0, head: 5, tail: 4, index: 0 })).to.be.true;
  expect(isEdge({ id: 0, graph: 0, head: 5, tail: 4 })).to.be.true;
  expect(isEdge({ graph: 0, tempHead: 5, tail: 4, index: 0 })).to.be.true;
  expect(isEdge({ id: 0, graph: 0, head: 5, tempTail: 4 })).to.be.true;
  expect(isEdge({ graph: 0, tempHead: 5, tempTail: 4, index: 0 })).to.be.true;
  expect(isEdge({ id: 0, graph: 0, tempTail: 5, tempHead: 4 })).to.be.true;
  expect(isEdge({ id: 0, graph: 0, tempHead: 4 })).to.be.false;
  expect(isEdge({ graph: 0, head: 4 })).to.be.false;
  expect(isDBEdge({ id: 0, graph: 0, head: 5, tail: 4, index: 0 })).to.be.true;
  expect(isDBEdge({ graph: 0, head: 5, tail: 4, index: 0  })).to.be.false;
  expect(isDBEdge({ id: 0, graph: 0, head: 5, tail: 4 })).to.be.true;
  expect(isDBEdge({ id: 0, graph: 0, tempHead: 5, tail: 4, index: 0 })).to.be.false;
  expect(isDBEdge({ id: 0, graph: 0, head: 5, tempTail: 4 })).to.be.false;
  expect(isDBEdge({ id: 0, graph: 0, tempHead: 5, tempTail: 4, index: 0 })).to.be.false;
  expect(isDBEdge({ id: 0, graph: 0, tempTail: 5, tempHead: 4 })).to.be.false;
  expect(sameEdge(
    { id: 0, graph: 0, head: 5, tail: 5, index: 0 },
    { id: 0, graph: 0, head: 5, tail: 5, index: 0 },
  )).to.be.true;
  expect(sameEdge(
    { id: 0, graph: 0, head: 5, tail: 5, index: 0, tempHead: 5 },
    { id: 0, graph: 0, head: 5, tail: 5, index: 0 },
  )).to.be.false;
  expect(sameEdge(
    { id: 0, graph: 0, head: 5, tail: 5, index: 0 },
    { id: 0, graph: 0, head: 4, tail: 5, index: 0 },
  )).to.be.false;
}

function testEdgeResolvers() {
  const nodes = [{ id: 0 }, { id: 1 }, { id: 2 }, { tempId: 0 }, { tempId: 3 }];
  expect(edgeResolves({ head: 0, tail: 1 }, nodes)).to.be.true;
  expect(edgeResolves({ head: 0, tempTail: 3 }, nodes)).to.be.true;
  expect(edgeResolves({ tempHead: 0, tail: 1 }, nodes)).to.be.true;
  expect(edgeResolves({ tempHead: 0, tempTail: 3 }, nodes)).to.be.true;
  expect(edgeResolves({ tempHead: 0, tempTail: 0 }, nodes)).to.be.false;
  expect(edgeResolves({ head: 0, head: 0 }, nodes)).to.be.false;
  expect(edgeDBResolves({ head: 0, tail: 1 }, nodes)).to.be.true;
  expect(edgeDBResolves({ head: 0, tempTail: 1 }, nodes)).to.be.false;
  expect(edgeDBResolves({ tempHead: 0, tail: 1 }, nodes)).to.be.false;
  expect(edgeDBResolves({ tempHead: 0, tempTail: 3 }, nodes)).to.be.false;
  expect(edgeDBResolves({ tempHead: 0, tempTail: 0 }, nodes)).to.be.false;
  expect(edgeDBResolves({ head: 0, head: 0 }, nodes)).to.be.false;
}

function testGraphTypes(goodDBGraph, goodGraph) {
  return () => {
    expect(isGraph(goodGraph)).to.be.true;
    expect(isGraph(goodDBGraph)).to.be.true;
    expect(isGraph({ ...goodGraph, id: 2 })).to.be.false;
    expect(isGraph({ 
      ...goodGraph, 
      nodes: [
        { graph: 2, ...goodGraph.nodes[0] }, 
        ...goodGraph.nodes,
      ],
    })).to.be.false;
    expect(isDBGraph(goodDBGraph)).to.be.true;
    expect(isDBGraph(goodGraph)).to.be.false;
    expect(isGraph({ ...goodDBGraph, id: 2 })).to.be.false;
    expect(isGraph({ 
      ...goodDBGraph, 
      nodes: [
        { graph: 2, ...goodDBGraph.nodes[0] }, 
        ...goodDBGraph.nodes,
      ],
    })).to.be.false;
  }
}

function testPOSTRequestType() {
  const goodRequest = {
    createNodes: [
      { tempId: 0, graph: 0 },
      { tempId: 1, graph: 0, location: [6, 9] },
    ],
    updateNodes: [
      { id: 0, graph: 0 },
      { id: 1, graph: 0, location: [4, 20] },
    ],
    deleteNodes: [2, 3],
    createEdges: [
      { graph: 0, tempHead: 0, tail: 3, index: 2 },
      { graph: 0, head: 2, tempTail: 1, },
      { graph: 0, head: 5, tail: 0, index: 1 },
    ],
    updateEdges: [
      { id: 0, graph: 0, tempHead: 0, tail: 3, index: 2 },
      { id: 1, graph: 0, head: 2, tempTail: 1, },
      { id: 2, graph: 0, head: 5, tail: 0, index: 1 },
    ],
    deleteEdges: [6, 9],
  };
  expect(isPOSTRequest(goodRequest)).to.be.true;
  expect(isPOSTRequest({ ...goodRequest, createNodes: undefined })).to.be.true;
  expect(isPOSTRequest({ ...goodRequest, updateNodes: undefined })).to.be.true;
  expect(isPOSTRequest({ ...goodRequest, deleteNodes: undefined })).to.be.true;
  expect(isPOSTRequest({ ...goodRequest, createEdges: undefined })).to.be.true;
  expect(isPOSTRequest({ ...goodRequest, updateEdges: undefined })).to.be.true;
  expect(isPOSTRequest({ ...goodRequest, deleteEdges: undefined })).to.be.true;
  expect(isPOSTRequest({
    ...goodRequest,
    createNodes: [ ...goodRequest.createNodes, { id: 5, graph: 0 }],
  })).to.be.false;
  expect(isPOSTRequest({
    ...goodRequest,
    updateNodes: [ ...goodRequest.createNodes, { tempId: 5, graph: 0 }],
  })).to.be.false;
  expect(isPOSTRequest({
    ...goodRequest,
    updateEdges: [ ...goodRequest.updateEdges, { ...goodRequest.updateEdges[0], id: undefined } ]
  })).to.be.false;
}

function testCreateRequest(oldGraph, graph) {
  return () => {
    const request = createRequest(oldGraph, graph);
    const createNodes = [
      { tempId: 0, graph: 0, location: [66.6, 6.66] },
      { tempId: 1, graph: 0, location: [.666, 69] },
    ];
    const updateNodes = [
      { id: 1, graph: 0, location: [.6969, 66.6] },
      { id: 4, graph: 0, location: [6.969, 6.66] },
      { id: 5, graph: 0, location: [66.6, 6.66] },
    ];
    const deleteNodes = [3];
    const createEdges = [
      { graph: 0, head: 5, tail: 2 },
      { graph: 0, head: 1, tail: 5 },
    ];
    const updateEdges = [
      { id: 2, graph: 0, tempHead: 1, tail: 0 },
      { id: 5, graph: 0, tempHead: 0, tempTail: 1 },
      { id: 7, graph: 0, head: 5, tail: 2 },
    ];
    const deleteEdges = [3, 6];

    request.createNodes.forEach((node, i) => (
      expect(sameNode(node, createNodes[i]), 'createNodes failed').to.be.true
    ));

    request.updateNodes.forEach((node, i) => (
      expect(sameNode(node, updateNodes[i]), 'updateNodes failed').to.be.true
    ));
    request.deleteNodes.forEach((k, i) => (
      expect(k, 'deleteNodes failed').to.equal(deleteNodes[i])
    ));
    request.createEdges.forEach((edge, i) => (
      expect(sameEdge(edge, createEdges[i]), 'createEdges failed').to.be.true
    ));
    request.updateEdges.forEach((edge, i) => (
      expect(sameEdge(edge, updateEdges[i]), 'updateEdges failed').to.be.true
    ));
    request.deleteEdges.forEach((k, i) => (
      expect(k, 'deleteEdges failed').to.equal(deleteEdges[i])
    ));

    expect(isPOSTRequest(request)).to.be.true;
  };
}

function testDBParsers() {
  const node1 = { id: 1, graph: 2 };
  const node2 = { ...node1, location: [3, 4] };
  expect(dbNodeValues()).to.equal('(id, graph, x, y)');
  expect(dbNodeToValueArray(node1)).to.deep.equal([1, 2, null, null]);
  expect(dbNodeToValueArray(node2)).to.deep.equal([1, 2, 3, 4]);
  expect(dbNodeToDummyValue(node1, 0)).to.equal('($1::INTEGER, $2::INTEGER, $3::NULL, $4::NULL)');
  expect(dbNodeToDummyValue(node2, 0)).to.equal('($1::INTEGER, $2::INTEGER, $3::FLOAT, $4::FLOAT)');
  expect(dbNodeToDummyValue(node1, 5)).to.equal('($21::INTEGER, $22::INTEGER, $23::NULL, $24::NULL)');
  expect(dbNodeToDummyValue(node2, 5)).to.equal('($21::INTEGER, $22::INTEGER, $23::FLOAT, $24::FLOAT)');
  expect(dbEdgeValues()).to.equal('(id, graph, head, tail, index)');
  const edge1 = { id: 1, graph: 0, head: 1, tail: 2 };
  const edge2 = { ...edge1, index: 0 };
  expect(dbEdgeToValueArray(edge1)).to.deep.equal([1, 0, 1, 2, null]);
  expect(dbEdgeToValueArray(edge2)).to.deep.equal([1, 0, 1, 2, 0]);
  expect(dbEdgeToDummyValue(edge1, 0)).to.equal('($1::INTEGER, $2::INTEGER, $3::INTEGER, $4::INTEGER, $5::NULL)');
  expect(dbEdgeToDummyValue(edge2, 0)).to.equal('($1::INTEGER, $2::INTEGER, $3::INTEGER, $4::INTEGER, $5::INTEGER)');
  expect(dbEdgeToDummyValue(edge1, 5)).to.equal('($26::INTEGER, $27::INTEGER, $28::INTEGER, $29::INTEGER, $30::NULL)');
  expect(dbEdgeToDummyValue(edge2, 5)).to.equal('($26::INTEGER, $27::INTEGER, $28::INTEGER, $29::INTEGER, $30::INTEGER)');
  const node3 = { graph: 2 };
  const node4 = { ...node3, location: [3, 4] };
  expect(dbNodeToValueArray(node3)).to.deep.equal([2, null, null]);
  expect(dbNodeToValueArray(node4)).to.deep.equal([2, 3, 4]);
  expect(dbNodeToDummyValue(node3, 0)).to.equal('($1::INTEGER, $2::NULL, $3::NULL)');
  expect(dbNodeToDummyValue(node4, 0)).to.equal('($1::INTEGER, $2::FLOAT, $3::FLOAT)');
  expect(dbNodeToDummyValue(node3, 5)).to.equal('($16::INTEGER, $17::NULL, $18::NULL)');
  expect(dbNodeToDummyValue(node4, 5)).to.equal('($16::INTEGER, $17::FLOAT, $18::FLOAT)');
  expect(dbEdgeValues()).to.equal('(id, graph, head, tail, index)');
  const edge3 = { graph: 0, head: 1, tail: 2 };
  const edge4 = { ...edge3, index: 0 };
  expect(dbEdgeToValueArray(edge3)).to.deep.equal([0, 1, 2, null]);
  expect(dbEdgeToValueArray(edge4)).to.deep.equal([0, 1, 2, 0]);
  expect(dbEdgeToDummyValue(edge3, 0)).to.equal('($1::INTEGER, $2::INTEGER, $3::INTEGER, $4::NULL)');
  expect(dbEdgeToDummyValue(edge4, 0)).to.equal('($1::INTEGER, $2::INTEGER, $3::INTEGER, $4::INTEGER)');
  expect(dbEdgeToDummyValue(edge3, 5)).to.equal('($21::INTEGER, $22::INTEGER, $23::INTEGER, $24::NULL)');
  expect(dbEdgeToDummyValue(edge4, 5)).to.equal('($21::INTEGER, $22::INTEGER, $23::INTEGER, $24::INTEGER)');
}

function testMapIds() {
  const request = {
    createNodes: [
      { tempId: 0, graph: 0 },
      { tempId: 1, graph: 0, location: [6, 9] },
    ],
    updateNodes: [
      { id: 0, graph: 0 },
      { id: 1, graph: 0, location: [4, 20] },
    ],
    deleteNodes: [2, 3],
    createEdges: [
      { graph: 0, tempHead: 0, tail: 3, index: 2 },
      { graph: 0, head: 2, tempTail: 1, },
      { graph: 0, head: 5, tail: 0, index: 1 },
    ],
    updateEdges: [
      { id: 0, graph: 0, tempHead: 0, tail: 3, index: 2 },
      { id: 1, graph: 0, head: 2, tempTail: 1, },
      { id: 2, graph: 0, head: 5, tail: 0, index: 1 },
    ],
    deleteEdges: [6, 9],
  };
  const newIds = [{ id: 13 }, { id: 666 }];
  const mapped = mapIds(request, newIds);
  const createEdges = [
    { graph: 0, tempHead: 0, head: 13, tail: 3, index: 2 },
    { graph: 0, head: 2, tempTail: 1, tail: 666, },
    { graph: 0, head: 5, tail: 0, index: 1 },
  ];
  const updateEdges = [
    { id: 0, graph: 0, head: 13, tempHead: 0, tail: 3, index: 2 },
    { id: 1, graph: 0, head: 2, tail: 666, tempTail: 1 },
    { id: 2, graph: 0, head: 5, tail: 0, index: 1 },
  ];
  expect(mapped.createNodes).to.be.undefined;
  expect(mapped.updateNodes).to.deep.equal(request.updateNodes);
  expect(mapped.deleteNodes).to.deep.equal(request.deleteNodes);
  expect(mapped.deleteEdges).to.deep.equal(request.deleteEdges);
  expect(mapped.createEdges).to.deep.equal(createEdges);
  expect(mapped.updateEdges).to.deep.equal(updateEdges);
}
