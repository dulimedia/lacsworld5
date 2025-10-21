import * as THREE from 'three';

export interface MeshReport {
  name: string;
  visible: boolean;
  vertices: number;
  triangles: number;
  hasMaterial: boolean;
  materialInfo: {
    side: string;
    transparent: boolean;
    opacity: number;
    depthWrite: boolean;
    depthTest: boolean;
    visible: boolean;
  }[];
  boundingBox: {
    min: THREE.Vector3;
    max: THREE.Vector3;
    size: THREE.Vector3;
  } | null;
  hasNormals: boolean;
  hasUVs: boolean;
  matrixDeterminant: number;
}

export function inspectMesh(mesh: THREE.Mesh): MeshReport {
  const geometry = mesh.geometry as THREE.BufferGeometry;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  
  const materialInfo = materials.map((mat: any) => ({
    side: mat.side === THREE.FrontSide ? 'FrontSide' : mat.side === THREE.BackSide ? 'BackSide' : 'DoubleSide',
    transparent: mat.transparent || false,
    opacity: mat.opacity !== undefined ? mat.opacity : 1,
    depthWrite: mat.depthWrite !== undefined ? mat.depthWrite : true,
    depthTest: mat.depthTest !== undefined ? mat.depthTest : true,
    visible: mat.visible !== undefined ? mat.visible : true,
  }));

  let boundingBox = null;
  if (geometry) {
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      const size = new THREE.Vector3();
      geometry.boundingBox.getSize(size);
      boundingBox = {
        min: geometry.boundingBox.min.clone(),
        max: geometry.boundingBox.max.clone(),
        size,
      };
    }
  }

  mesh.updateMatrixWorld(true);

  return {
    name: mesh.name || 'unnamed',
    visible: mesh.visible,
    vertices: geometry?.attributes.position?.count || 0,
    triangles: geometry?.index ? geometry.index.count / 3 : (geometry?.attributes.position?.count || 0) / 3,
    hasMaterial: materials.length > 0 && materials[0] !== null,
    materialInfo,
    boundingBox,
    hasNormals: !!geometry?.attributes.normal,
    hasUVs: !!geometry?.attributes.uv,
    matrixDeterminant: mesh.matrixWorld.determinant(),
  };
}

export function generateSceneReport(root: THREE.Object3D, filter?: (mesh: THREE.Mesh) => boolean): MeshReport[] {
  const reports: MeshReport[] = [];
  
  root.traverse((o: any) => {
    if (!o.isMesh) return;
    if (filter && !filter(o)) return;
    reports.push(inspectMesh(o));
  });
  
  return reports;
}

export function findProblematicMeshes(reports: MeshReport[]): {
  invisible: MeshReport[];
  noGeometry: MeshReport[];
  mirrored: MeshReport[];
  noMaterial: MeshReport[];
  transparentIssues: MeshReport[];
} {
  return {
    invisible: reports.filter(r => !r.visible),
    noGeometry: reports.filter(r => r.vertices === 0),
    mirrored: reports.filter(r => r.matrixDeterminant < 0),
    noMaterial: reports.filter(r => !r.hasMaterial),
    transparentIssues: reports.filter(r => 
      r.materialInfo.some(m => m.transparent && !m.depthWrite)
    ),
  };
}

export function printReport(reports: MeshReport[], title: string = 'Mesh Report') {
  console.group(`📊 ${title}`);
  console.log(`Total meshes: ${reports.length}`);
  
  const problems = findProblematicMeshes(reports);
  
  if (problems.invisible.length > 0) {
    console.group(`❌ Invisible meshes (${problems.invisible.length})`);
    problems.invisible.forEach(m => console.log(`- ${m.name}`));
    console.groupEnd();
  }
  
  if (problems.noGeometry.length > 0) {
    console.group(`❌ No geometry (${problems.noGeometry.length})`);
    problems.noGeometry.forEach(m => console.log(`- ${m.name}`));
    console.groupEnd();
  }
  
  if (problems.mirrored.length > 0) {
    console.group(`🔄 Mirrored (${problems.mirrored.length})`);
    problems.mirrored.forEach(m => console.log(`- ${m.name} (det: ${m.matrixDeterminant.toFixed(3)})`));
    console.groupEnd();
  }
  
  if (problems.noMaterial.length > 0) {
    console.group(`❌ No material (${problems.noMaterial.length})`);
    problems.noMaterial.forEach(m => console.log(`- ${m.name}`));
    console.groupEnd();
  }
  
  if (problems.transparentIssues.length > 0) {
    console.group(`⚠️ Transparent depth issues (${problems.transparentIssues.length})`);
    problems.transparentIssues.forEach(m => console.log(`- ${m.name}`));
    console.groupEnd();
  }
  
  console.log('\n📋 Detailed mesh data:', reports);
  console.groupEnd();
  
  return problems;
}
