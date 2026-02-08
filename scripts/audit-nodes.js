#!/usr/bin/envnode

/**
*ComprehensiveNodeAuditScript
*Checksallnodesfor:
*1.Configurationstructureissues
*2.Datastructurecompatibility
*3.Backend-frontendintegration
*4.Requiredvsoptionalparameters
*5.Input/outputschemaconsistency
*/

constfs=require('fs');
constpath=require('path');

constBACKEND_DIR=path.join(__dirname,'backend2','src','nodes');
constISSUES=[];

//Helpertofindallnodefiles
functionfindNodeFiles(dir,fileList=[]){
constfiles=fs.readdirSync(dir);

files.forEach(file=>{
constfilePath=path.join(dir,file);
conststat=fs.statSync(filePath);

if(stat.isDirectory()&&file!=='node_modules'){
findNodeFiles(filePath,fileList);
}elseif(file.endsWith('.node.ts')||file.endsWith('.node.js')){
fileList.push(filePath);
}
});

returnfileList;
}

//Auditasinglenodefile
functionauditNode(filePath){
constcontent=fs.readFileSync(filePath,'utf8');
constrelativePath=path.relative(BACKEND_DIR,filePath);
constcategory=path.dirname(relativePath).split(path.sep)[0]||'root';
constnodeName=path.basename(filePath,'.node.ts');

constissues=[];

//Check1:Nodeclassdefinition
if(!content.includes('getNodeDefinition()')){
issues.push({
type:'MISSING_DEFINITION',
severity:'CRITICAL',
message:'NodedoesnothavegetNodeDefinition()method'
});
}

//Check2:Executemethod
if(!content.includes('asyncexecute(')){
issues.push({
type:'MISSING_EXECUTE',
severity:'CRITICAL',
message:'Nodedoesnothaveexecute()method'
});
}

//Check3:Configaccesspattern
constconfigAccessPatterns=[
/node\.config\s*[!=]/g,
/node\.data\?\.config/g,
/node\.data\.config/g
];

consthasDirectConfigAccess=/node\.config\s*[!=]/g.test(content);
consthasDataConfigAccess=/node\.data\?\.config|node\.data\.config/g.test(content);

if(hasDirectConfigAccess&&!hasDataConfigAccess){
issues.push({
type:'CONFIG_ACCESS',
severity:'HIGH',
message:'Nodeaccessesnode.configdirectlyinsteadofnode.data?.config'
});
}

//Check4:Requiredparametersvalidation
consthasRequiredCheck=content.includes('required:true');
consthasValidation=content.includes('validate')||content.includes('Validation');

if(hasRequiredCheck&&!hasValidation){
issues.push({
type:'VALIDATION',
severity:'MEDIUM',
message:'Nodehasrequiredparametersbutmaylackvalidationinexecute()'
});
}

//Check5:Inputaccesspattern
constinputAccessPatterns=[
/context\.input\?\./g,
/context\.input\./g,
/context\.input\[/g
];

consthasSafeInputAccess=/context\.input\?\./g.test(content);
consthasUnsafeInputAccess=/context\.input\.[^?]/g.test(content);

if(hasUnsafeInputAccess&&!hasSafeInputAccess){
issues.push({
type:'INPUT_ACCESS',
severity:'MEDIUM',
message:'Nodemayaccesscontext.inputwithoutoptionalchaining'
});
}

//Check6:Errorhandling
consthasTryCatch=content.includes('try{')&&content.includes('catch');
if(!hasTryCatch){
issues.push({
type:'ERROR_HANDLING',
severity:'HIGH',
message:'Nodeexecute()methodmaylackerrorhandling'
});
}

//Check7:Returnstructure
consthasSuccessReturn=content.includes('success:true')||content.includes('success:false');
consthasDurationReturn=content.includes('duration:');

if(!hasSuccessReturn){
issues.push({
type:'RETURN_STRUCTURE',
severity:'MEDIUM',
message:'NodemaynotreturnstandardExecutionResultstructure'
});
}

if(!hasDurationReturn){
issues.push({
type:'DURATION',
severity:'LOW',
message:'Nodemaynotreturndurationinresult'
});
}

//Check8:Loggerusage
consthasLogger=content.includes('logger.')||content.includes('require.*logger');
if(!hasLogger){
issues.push({
type:'LOGGING',
severity:'LOW',
message:'Nodemaynotuseloggerfordebugging'
});
}

//Check9:TypeScripttypes
consthasTypes=content.includes(':ExecutionContext')||content.includes(':ExecutionResult');
if(!hasTypes){
issues.push({
type:'TYPES',
severity:'LOW',
message:'NodemaynotuseproperTypeScripttypes'
});
}

//Check10:NodeIDconsistency
constnodeIdMatch=content.match(/id:\s*['"]([^'"]+)['"]/);
if(nodeIdMatch){
constnodeId=nodeIdMatch[1];
constfileNameId=nodeName.replace(/-/g,'.');

//CheckifIDmatchesnamingconvention
if(!nodeId.includes(nodeName.replace(/-node$/,'').replace(/-/g,'.'))){
issues.push({
type:'ID_CONSISTENCY',
severity:'LOW',
message:`NodeID"${nodeId}"maynotmatchnamingconvention`
});
}
}

//Check11:Parametersdefinition
consthasParameters=content.includes('parameters:');
consthasInputs=content.includes('inputs:');
consthasOutputs=content.includes('outputs:');

if(!hasParameters){
issues.push({
type:'PARAMETERS',
severity:'MEDIUM',
message:'Nodedefinitionmaynothaveparametersarray'
});
}

if(!hasInputs){
issues.push({
type:'INPUTS',
severity:'MEDIUM',
message:'Nodedefinitionmaynothaveinputsarray'
});
}

if(!hasOutputs){
issues.push({
type:'OUTPUTS',
severity:'MEDIUM',
message:'Nodedefinitionmaynothaveoutputsarray'
});
}

//Check12:Specificknownissues
if(content.includes('context.input.csvString')&&!content.includes('context.input?.csvString')){
issues.push({
type:'CSV_INPUT',
severity:'HIGH',
message:'CSVnodeaccessescontext.input.csvStringwithoutoptionalchaining'
});
}

if(content.includes('node.config')&&!content.includes('node.data?.config')){
issues.push({
type:'MATH_CONFIG',
severity:'HIGH',
message:'Nodeaccessesnode.configdirectly-shouldusenode.data?.config'
});
}

if(content.includes('Unsupportedtransformationmode:map')){
issues.push({
type:'DATA_TRANSFORM_MODE',
severity:'HIGH',
message:'DataTransformnodedoesnotsupport"map"mode-onlyjavascript,template,jsonpath,xpath'
});
}

return{
file:relativePath,
category,
nodeName,
issues,
lineCount:content.split('\n').length
};
}

//Mainauditfunction
functionauditAllNodes(){
console.log('Startingcomprehensivenodeaudit...\n');

constnodeFiles=findNodeFiles(BACKEND_DIR);
console.log(`Found${nodeFiles.length}nodefiles\n`);

constresults=[];
lettotalIssues=0;

nodeFiles.forEach(filePath=>{
constresult=auditNode(filePath);
if(result.issues.length>0){
results.push(result);
totalIssues+=result.issues.length;
}
});

//Generatereport
console.log('='.repeat(80));
console.log('NODEAUDITREPORT');
console.log('='.repeat(80));
console.log(`\nTotalNodesAudited:${nodeFiles.length}`);
console.log(`NodeswithIssues:${results.length}`);
console.log(`TotalIssuesFound:${totalIssues}\n`);

//Groupbyseverity
constbySeverity={
CRITICAL:[],
HIGH:[],
MEDIUM:[],
LOW:[]
};

results.forEach(result=>{
result.issues.forEach(issue=>{
bySeverity[issue.severity].push({
node:result.nodeName,
file:result.file,
...issue
});
});
});

//Printbyseverity
Object.keys(bySeverity).forEach(severity=>{
constissues=bySeverity[severity];
if(issues.length>0){
console.log(`\n${severity}ISSUES(${issues.length}):`);
console.log('-'.repeat(80));
issues.forEach(issue=>{
console.log(`\n[${issue.node}]${issue.type}`);
console.log(`File:${issue.file}`);
console.log(`Issue:${issue.message}`);
});
}
});

//Printbycategory
console.log('\n\n'+'='.repeat(80));
console.log('ISSUESBYCATEGORY');
console.log('='.repeat(80));

constbyCategory={};
results.forEach(result=>{
if(!byCategory[result.category]){
byCategory[result.category]=[];
}
byCategory[result.category].push(result);
});

Object.keys(byCategory).sort().forEach(category=>{
constcategoryResults=byCategory[category];
constcategoryIssues=categoryResults.reduce((sum,r)=>sum+r.issues.length,0);
console.log(`\n${category.toUpperCase()}(${categoryResults.length}nodes,${categoryIssues}issues):`);
categoryResults.forEach(result=>{
if(result.issues.length>0){
console.log(`-${result.nodeName}:${result.issues.length}issues`);
result.issues.forEach(issue=>{
console.log(`[${issue.severity}]${issue.type}:${issue.message}`);
});
}
});
});

//Savedetailedreport
constreport={
summary:{
totalNodes:nodeFiles.length,
nodesWithIssues:results.length,
totalIssues:totalIssues,
bySeverity:{
CRITICAL:bySeverity.CRITICAL.length,
HIGH:bySeverity.HIGH.length,
MEDIUM:bySeverity.MEDIUM.length,
LOW:bySeverity.LOW.length
}
},
results:results.map(r=>({
file:r.file,
category:r.category,
nodeName:r.nodeName,
issues:r.issues
}))
};

fs.writeFileSync(
path.join(__dirname,'NODE_AUDIT_REPORT.json'),
JSON.stringify(report,null,2)
);

console.log('\n\n'+'='.repeat(80));
console.log('Detailedreportsavedto:NODE_AUDIT_REPORT.json');
console.log('='.repeat(80));

returnreport;
}

//Runaudit
if(require.main===module){
try{
constreport=auditAllNodes();
process.exit(report.summary.totalIssues>0?1:0);
}catch(error){
console.error('Auditfailed:',error);
process.exit(1);
}
}

module.exports={auditAllNodes,auditNode};

