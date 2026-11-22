using UnityEngine;
using UnityEngine.InputSystem;
using Unity.Cinemachine;

[System.Serializable]
public class RoomData
{
    public string baseAPIUrl;
    public string scanId;
}


public class PlayerMovement : MonoBehaviour
{
    public Rigidbody rb;
    [SerializeField] private float moveSpeed;
    private float defaultMoveSpeed;
    [SerializeField] private InputActionReference move;
    [SerializeField] private InputActionReference verticalMove;
    [SerializeField] private CinemachineInputAxisController controller;

    private Vector3 moveDirection;
    private float verticalInput;

    void OnEnable()
    {
        move.action.Enable();
        verticalMove.action.Enable();
    }
    void OnDisable()
    {
        move.action.Disable();
        verticalMove.action.Disable();
    }

    void Update()
    {
        moveDirection = move.action.ReadValue<Vector3>();
        verticalInput = verticalMove.action.ReadValue<float>();
        moveDirection.y = verticalInput;
    }

    void FixedUpdate()
    {
        // Get camera directions
        Transform cameraTransform = Camera.main.transform;
        Vector3 cameraForward = cameraTransform.forward;
        Vector3 cameraRight = cameraTransform.right;

        cameraForward.Normalize();
        cameraRight.Normalize();
        
        // Calculate movement direction based on camera orientation
        Vector3 desiredMoveDirection = 
            cameraForward * moveDirection.z + 
            cameraRight * moveDirection.x +
            cameraTransform.up.normalized * verticalInput;

        rb.linearVelocity = desiredMoveDirection * moveSpeed;
    }


}
