import React from "react";

function IntersectionView({ laneData }) {

  return (

    <div style={{
      width:"400px",
      height:"400px",
      border:"2px solid black",
      position:"relative",
      margin:"auto"
    }}>

      <div style={{position:"absolute",top:"10px",left:"180px"}}>
        E1: {laneData.E1}
      </div>

      <div style={{position:"absolute",bottom:"10px",left:"180px"}}>
        E3: {laneData.E3}
      </div>

      <div style={{position:"absolute",left:"10px",top:"180px"}}>
        E2: {laneData.E2}
      </div>

      <div style={{position:"absolute",right:"10px",top:"180px"}}>
        E4: {laneData.E4}
      </div>

    </div>

  );
}

export default IntersectionView;